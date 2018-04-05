import { ReplayWorker, isInitializeCommand } from '../lib';

let replayWorker: ReplayWorker;
addEventListener('message', async (evt) => {
    try {
        if (!replayWorker && isInitializeCommand(evt.data)) {
            replayWorker = new ReplayWorker(evt.data);
            postMessage('WORKER_INITIALIZED');
        }
    } catch (e) {
        console.error(e);
    }
});
