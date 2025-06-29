# 白板动画组件架构

## 整体流程

1. **资产生成阶段**
   - `generateAnimationAssetsV2` 调用，生成音频和图片资产
   - 后台任务运行，前端显示进度
   - `use-assets-status-tracking.ts` 轮询资产状态

2. **白板动画生成阶段**
   - 当图片资产完成后，`WhiteboardAnimation` 组件显示
   - 用户点击"生成动画"按钮
   - 调用 `createWhiteboardAnimation` API 创建任务
   - `useWhiteboardAnimation` hook 轮询任务状态
   - 完成后显示白板动画视频

## 组件结构

```
AnimationAssets (index.tsx)
├── AnimationAssetsProvider (provider.tsx)
├── Scene (scene.tsx)
│   └── Shot (shot.tsx)
│       ├── AudioTask (audio-task.tsx)
│       ├── ImageTask (image-task.tsx)
│       └── WhiteboardAnimation (whiteboard-animation.tsx) [新增]
└── useAssetsStatusTracking (use-assets-status-tracking.ts)
```

## 新增组件

### WhiteboardAnimation
- 独立的白板动画组件
- 接收图片资产ID和相关信息
- 管理动画任务的创建和状态跟踪
- 显示动画生成进度和最终视频

### useWhiteboardAnimation
- 管理白板动画状态的 hook
- 处理任务创建和状态轮询
- 提供加载状态和错误处理

## API 接口

### createWhiteboardAnimation
- 输入：`imageAssetId`, `storyId`, `sceneId`
- 创建白板动画任务
- 返回任务ID

### getWhiteboardAnimationStatus
- 输入：`taskId`
- 查询动画任务状态
- 返回状态、视频URL等信息

## 数据库

### animationAsset 表
- 新增 `assetType: 'whiteboard_animation'`
- 复用现有表结构
- `metadata` 字段存储源图片信息

## 使用方式

```tsx
<WhiteboardAnimation
  imageAssetId="ulid_image_123"
  storyId="story_456"
  sceneId="1"
  imageUrl="https://..."
  className="w-full"
/>
```

## 状态流转

```
pending -> processing -> completed/failed
```

- `pending`: 任务已创建，等待处理
- `processing`: 正在生成白板动画
- `completed`: 动画生成完成，可播放
- `failed`: 生成失败，显示错误信息
