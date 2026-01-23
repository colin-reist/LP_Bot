const logger = require('#logger');
const { sequelize } = require('../../database/database.js');

/**
 * Health Check System
 * Monitore l'état du bot et de ses dépendances
 */

class HealthCheck {
	constructor(client) {
		this.client = client;
		this.status = {
			bot: 'unknown',
			database: 'unknown',
			discord: 'unknown',
			lastCheck: null,
			uptime: 0,
		};

		this.thresholds = {
			dbResponseTime: 1000, // 1 seconde max
			memoryUsage: 0.95, // 95% max
			eventLoopDelay: 100, // 100ms max
		};

		this.metrics = {
			commandsExecuted: 0,
			errors: 0,
			dbQueries: 0,
			eventsProcessed: 0,
		};
	}

	/**
	 * Démarre les health checks périodiques
	 */
	start(intervalMs = 60000) {
		logger.info('Health check system started');

		// Check initial
		this.performCheck();

		// Check périodique
		this.interval = setInterval(() => {
			this.performCheck();
		}, intervalMs);
	}

	/**
	 * Arrête les health checks
	 */
	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			logger.info('Health check system stopped');
		}
	}

	/**
	 * Effectue un health check complet
	 */
	async performCheck() {
		const startTime = Date.now();

		try {
			// Check bot status
			const botHealth = await this.checkBotHealth();

			// Check database
			const dbHealth = await this.checkDatabaseHealth();

			// Check Discord API
			const discordHealth = await this.checkDiscordHealth();

			// Met à jour le status global
			this.status = {
				bot: botHealth,
				database: dbHealth,
				discord: discordHealth,
				lastCheck: new Date(),
				uptime: process.uptime(),
				checkDuration: Date.now() - startTime,
			};

			// Log si des problèmes sont détectés
			if (botHealth !== 'healthy' || dbHealth !== 'healthy' || discordHealth !== 'healthy') {
				logger.warn('Health check detected issues:', this.status);
			} else {
				logger.debug('Health check passed', {
					duration: this.status.checkDuration,
					uptime: Math.floor(this.status.uptime),
				});
			}

			return this.status;

		} catch (error) {
			logger.error('Health check failed:', error);
			this.status.bot = 'unhealthy';
			this.status.lastCheck = new Date();
			return this.status;
		}
	}

	/**
	 * Vérifie la santé du bot (mémoire, event loop)
	 */
	async checkBotHealth() {
		try {
			// Mémoire
			const memUsage = process.memoryUsage();
			const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;

			if (heapUsedPercent > this.thresholds.memoryUsage) {
				logger.warn(`High memory usage: ${(heapUsedPercent * 100).toFixed(2)}%`);
				return 'degraded';
			}

			// Event loop lag
			const eventLoopLag = await this.measureEventLoopLag();
			if (eventLoopLag > this.thresholds.eventLoopDelay) {
				logger.warn(`High event loop lag: ${eventLoopLag}ms`);
				return 'degraded';
			}

			return 'healthy';

		} catch (error) {
			logger.error('Bot health check failed:', error);
			return 'unhealthy';
		}
	}

	/**
	 * Vérifie la connexion à la base de données
	 */
	async checkDatabaseHealth() {
		const startTime = Date.now();

		try {
			// Test simple query
			await sequelize.authenticate();

			const responseTime = Date.now() - startTime;

			if (responseTime > this.thresholds.dbResponseTime) {
				logger.warn(`Slow database response: ${responseTime}ms`);
				return 'degraded';
			}

			return 'healthy';

		} catch (error) {
			logger.error('Database health check failed:', error);
			return 'unhealthy';
		}
	}

	/**
	 * Vérifie la connexion à Discord
	 */
	async checkDiscordHealth() {
		try {
			// Vérifie le statut du client
			if (!this.client || !this.client.isReady()) {
				return 'unhealthy';
			}

			// Vérifie le ping WebSocket
			const ping = this.client.ws.ping;

			if (ping < 0) {
				return 'unhealthy';
			}

			if (ping > 500) {
				logger.warn(`High Discord API latency: ${ping}ms`);
				return 'degraded';
			}

			return 'healthy';

		} catch (error) {
			logger.error('Discord health check failed:', error);
			return 'unhealthy';
		}
	}

	/**
	 * Mesure le lag de l'event loop
	 */
	async measureEventLoopLag() {
		const start = Date.now();

		return new Promise((resolve) => {
			setImmediate(() => {
				const lag = Date.now() - start;
				resolve(lag);
			});
		});
	}

	/**
	 * Incrémente un compteur de métrique
	 */
	incrementMetric(metric) {
		if (this.metrics.hasOwnProperty(metric)) {
			this.metrics[metric]++;
		}
	}

	/**
	 * Retourne le status complet
	 */
	getStatus() {
		return {
			...this.status,
			metrics: { ...this.metrics },
			memory: process.memoryUsage(),
			cpu: process.cpuUsage(),
		};
	}

	/**
	 * Détermine si le bot est healthy
	 */
	isHealthy() {
		return (
			this.status.bot === 'healthy' &&
			this.status.database === 'healthy' &&
			this.status.discord === 'healthy'
		);
	}

	/**
	 * Génère un rapport de santé lisible
	 */
	getHealthReport() {
		const status = this.getStatus();
		const uptime = Math.floor(status.uptime);
		const hours = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);

		return {
			status: this.isHealthy() ? '✅ Healthy' : '⚠️ Issues Detected',
			components: {
				bot: this.formatStatus(status.bot),
				database: this.formatStatus(status.database),
				discord: this.formatStatus(status.discord),
			},
			uptime: `${hours}h ${minutes}m`,
			lastCheck: status.lastCheck?.toISOString() || 'Never',
			metrics: status.metrics,
			memory: `${Math.round(status.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(status.memory.heapTotal / 1024 / 1024)}MB`,
		};
	}

	/**
	 * Formate un status avec emoji
	 */
	formatStatus(status) {
		switch (status) {
			case 'healthy':
				return '✅ Healthy';
			case 'degraded':
				return '⚠️ Degraded';
			case 'unhealthy':
				return '❌ Unhealthy';
			default:
				return '❓ Unknown';
		}
	}
}

module.exports = { HealthCheck };
