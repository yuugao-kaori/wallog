import schedule from 'node-schedule';
import { runSetup } from '../setup/setup.js';
import { runMaintenance } from '../setup/maintenance.js';
import { runMinioMaintenance } from '../setup/minio_maintenance.js';

// グローバル変数としてフラグを定義
let isMaintenanceRunning = false;

// メンテナンスジョブの実行関数
const executeMaintenanceJobs = async () => {
  if (isMaintenanceRunning) {
    console.log('Maintenance already in progress, skipping...');
    return;
  }

  isMaintenanceRunning = true;
  console.log('Starting maintenance jobs...', new Date().toISOString());

  try {
    await runSetup();
    console.log('Setup completed');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await runMaintenance();
    console.log('Maintenance completed');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await runMinioMaintenance();
    console.log('MinIO maintenance completed');

    console.log('All maintenance jobs completed successfully', new Date().toISOString());
  } catch (error) {
    console.error('Error running maintenance jobs:', error);
  } finally {
    isMaintenanceRunning = false;
  }
};

export function startMaintenanceScheduler() {
  console.log('Starting maintenance scheduler...');
  
  // 定期実行のスケジュール設定（毎日午前3時）
  const job = schedule.scheduleJob('0 3 * * *', executeMaintenanceJobs);
  console.log('Maintenance scheduled for 3 AM daily');
  
  // 初回実行（5秒後）
  setTimeout(executeMaintenanceJobs, 5000);

  // エラーハンドリング
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
