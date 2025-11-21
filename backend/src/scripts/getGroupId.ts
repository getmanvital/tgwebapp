import 'dotenv/config';
import { resolveGroupId } from '../services/vkClient.js';

const screenName = process.argv[2];

if (!screenName) {
  console.error('Usage: npm run get-group-id <screen_name>');
  console.error('Example: npm run get-group-id street.football.club');
  console.error('Or: npm run get-group-id https://vk.com/street.football.club');
  process.exit(1);
}

(async () => {
  try {
    const groupId = await resolveGroupId(screenName);
    
    if (groupId) {
      console.log(`\n✅ ID группы: ${groupId}`);
      console.log(`\nДобавьте в .env файл:`);
      console.log(`VK_GROUP_ID=${groupId}\n`);
    } else {
      console.error('❌ Группа не найдена или это не группа');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
})();




