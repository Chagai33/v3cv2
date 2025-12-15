"use strict";
// CloudTasksClient - wrapper ל-Google Cloud Tasks
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksClient = void 0;
const tasks_1 = require("@google-cloud/tasks");
class TasksClient {
    constructor(projectId, location, queue) {
        this.projectId = projectId;
        this.location = location;
        this.queue = queue;
        this.client = new tasks_1.CloudTasksClient();
    }
    async createSyncTask(payload, delaySeconds) {
        const parent = this.client.queuePath(this.projectId, this.location, this.queue);
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${this.location}-${this.projectId}.cloudfunctions.net/processCalendarSyncJob`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: {
                    serviceAccountEmail: `${this.projectId}@appspot.gserviceaccount.com`
                }
            },
            scheduleTime: {
                seconds: Math.floor(Date.now() / 1000) + delaySeconds
            }
        };
        await this.client.createTask({ parent, task });
    }
    async createDeletionTask(payload) {
        const parent = this.client.queuePath(this.projectId, this.location, this.queue);
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${this.location}-${this.projectId}.cloudfunctions.net/processDeletionJob`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: {
                    serviceAccountEmail: `${this.projectId}@appspot.gserviceaccount.com`
                }
            },
            scheduleTime: {
                seconds: Math.floor(Date.now() / 1000)
            }
        };
        await this.client.createTask({ parent, task });
    }
}
exports.TasksClient = TasksClient;
//# sourceMappingURL=CloudTasksClient.js.map