import schedule from 'node-schedule';
import { runSetup } from '../setup/setup.js';
import { runMaintenance } from '../setup/maintenance.js';
import { runMinioMaintenance } from '../setup/minio_maintenance.js';
import { generateAndSaveSitemap } from '../setup/sitemap_generator.js';

// グローバル変数としてフラグを定義
let isMaintenanceRunning = false;
let isSitemapGenerationRunning = false;

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
    
    // サイトマップの更新もメインメンテナンスの一部として実行
    await generateAndSaveSitemap();
    console.log('Sitemap updated as part of maintenance');

    console.log('All maintenance jobs completed successfully', new Date().toISOString());
  } catch (error) {
    console.error('Error running maintenance jobs:', error);
  } finally {
    isMaintenanceRunning = false;
  }
};

// サイトマップ生成ジョブの実行関数
const executeSitemapGeneration = async () => {
  if (isSitemapGenerationRunning) {
    console.log('Sitemap generation already in progress, skipping...');
    return;
  }
  
  isSitemapGenerationRunning = true;
  console.log('Starting sitemap generation...', new Date().toISOString());
  
  try {
    await generateAndSaveSitemap();
    console.log('Sitemap generation completed', new Date().toISOString());
  } catch (error) {
    console.error('Error generating sitemap:', error);
  } finally {
    isSitemapGenerationRunning = false;
  }
};

export function startMaintenanceScheduler() {
  console.log('Starting maintenance scheduler...');
  
  // 定期実行のスケジュール設定（毎日午前3時）
  const maintenanceJob = schedule.scheduleJob('0 3 * * *', executeMaintenanceJobs);
  console.log('Maintenance scheduled for 3 AM daily');
  
  // サイトマップ更新の定期実行（毎時0分）
  const sitemapJob = schedule.scheduleJob('0 * * * *', executeSitemapGeneration);
  console.log('Sitemap generation scheduled for every hour at 0 minutes');
  
  // 初回実行（5秒後）
  setTimeout(executeMaintenanceJobs, 5000);
  // サイトマップも初回実行（10秒後）
  setTimeout(executeSitemapGeneration, 10000);

  // エラーハンドリング
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
