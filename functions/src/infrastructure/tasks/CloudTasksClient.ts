// CloudTasksClient - wrapper ל-Google Cloud Tasks

import { CloudTasksClient as GoogleCloudTasksClient } from '@google-cloud/tasks';

export class TasksClient {
  private client: GoogleCloudTasksClient;

  constructor(
    private projectId: string,
    private location: string,
    private queue: string
  ) {
    this.client = new GoogleCloudTasksClient();
  }

  async createSyncTask(
    payload: { birthdayIds: string[]; userId: string; jobId: string },
    delaySeconds: number
  ): Promise<void> {
    const parent = this.client.queuePath(this.projectId, this.location, this.queue);
    
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
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

  async createDeletionTask(
    payload: { userId: string; tenantId: string }
  ): Promise<void> {
    const parent = this.client.queuePath(this.projectId, this.location, this.queue);
    
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
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



