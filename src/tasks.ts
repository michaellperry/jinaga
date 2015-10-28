export class Task {
    public isDone: boolean = false;
    public taskQueue: TaskQueue = null;

    done() {
        if (this.taskQueue) {
            this.taskQueue.onTaskDone();
        }
        else {
            this.isDone = true;
        }
    }
}

export class TaskQueue {
    public count: number = 0;
    private done: () => void;

    push(task: Task) {
        if (!task.isDone) {
            task.taskQueue = this;
            this.count++;
        }
    }

    whenFinished(done: () => void) {
        if (this.count === 0) {
            done();
        }
        else {
            this.done = done;
        }
    }

    onTaskDone() {
        this.count--;
        if (this.count === 0) {
            this.done();
        }
    }
}
