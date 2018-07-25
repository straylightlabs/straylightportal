const cron = require('node-cron');
const taskController = require('./controllers/task-controller');

module.exports = function() {
  cron.schedule('0 * * * *', function() {
    taskController.sendReminderEmails();
  });
}

