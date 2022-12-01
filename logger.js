const { createLogger, transports, format } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.simple(),
  transports: [new transports.Console()],
});
logger.log = logger.info
module.exports = logger;