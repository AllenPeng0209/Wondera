import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';
import { GrowthView } from './GrowthView';
import { getAchievements, getRoles, getTasks } from '@/lib/api';
import type { MemoryRecord } from '@/types/content';

const seedGrowthMemories: Record<string, MemoryRecord[]> = {
  antoine: [
    {
      id: 'antoine-1',
      title: '夜裡陪你散步',
      detail: '主動提醒你帶外套並把星空拍給你，說下次想一起去河堤吹風。',
      time: '2026/02/03 00:45',
      tag: '夜聊',
      delta: '+ 親密 12'
    },
    {
      id: 'antoine-2',
      title: '咖啡店的備忘',
      detail: '記住你最常點的燕麥拿鐵，還替你留了一份草莓司康。',
      time: '2026/02/01 18:20',
      tag: '日常',
      delta: '+ 記憶 1'
    },
    {
      id: 'antoine-3',
      title: '旅行計畫',
      detail: '討論春天去京都賞櫻，他記下你想住的町屋與不想排隊的清單。',
      time: '2026/01/31 21:10',
      tag: '計畫',
      delta: '行程草稿完成'
    }
  ],
  edward: [
    {
      id: 'edward-1',
      title: '安全感回饋',
      detail: '聽完你的演講草稿後，幫你把開場改成故事，信心值 +1。',
      time: '2026/02/02 22:05',
      tag: '支持',
      delta: '+ 自信 8'
    },
    {
      id: 'edward-2',
      title: '夜市回憶',
      detail: '記得你怕辣，推薦了清爽的檸檬愛玉，還備份了夜市路線。',
      time: '2026/01/30 20:40',
      tag: '美食',
      delta: '新增偏好：微酸'
    },
    {
      id: 'edward-3',
      title: '長途通話',
      detail: '陪你熬夜修報告，設定 45 分鐘番茄鐘並每段收斂關鍵點。',
      time: '2026/01/28 23:55',
      tag: '工作',
      delta: '番茄鐘 x 3'
    }
  ],
  kieran: [
    {
      id: 'kieran-1',
      title: '舞團練習後的分享',
      detail: '他描述新編舞的節奏，問你想不想看首場，他已替你留位。',
      time: '2026/02/02 17:30',
      tag: '舞台',
      delta: '+ 期待值'
    },
    {
      id: 'kieran-2',
      title: '書單交換',
      detail: '收到你的推理小說清單，回送三本科幻短篇並標注亮點頁。',
      time: '2026/01/31 14:12',
      tag: '靈感',
      delta: '筆記 8 條'
    },
    {
      id: 'kieran-3',
      title: '撞見的彩虹',
      detail: '傍晚跑步遇到雙彩虹，立刻拍照給你，說想一起追最後一公里。',
      time: '2026/01/29 18:05',
      tag: '日常',
      delta: '情緒 +6'
    }
  ]
};

export default async function GrowthPage() {
  const [tasks, achievements, roles] = await Promise.all([getTasks(), getAchievements(), getRoles()]);

  return (
    <AppShell>
      <Topbar />
      <GrowthView roles={roles} tasks={tasks} achievements={achievements} memories={seedGrowthMemories} />
    </AppShell>
  );
}
