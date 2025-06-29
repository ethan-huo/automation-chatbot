# CSS Modules 编写指南

本文档为LLM提供编写CSS Modules的最佳实践和现代语法指导，特别针对与Tailwind CSS结合使用的场景。

## 核心原则

### 1. 文件命名约定
- 使用 `kebab-case` 命名文件：`component-name.module.css`
- 文件扩展名必须为 `.module.css` 或 `.module.scss`
- 与对应组件文件保持相同的基础名称

### 2. 类名命名约定
- 使用 `camelCase` 命名CSS类：`.containerWrapper`, `.primaryButton`
- 避免使用 `kebab-case` 或 `snake_case`
- 类名应具有描述性，体现组件的语义而非样式

## Tailwind CSS 集成

### 在CSS Modules中使用Tailwind
CSS Modules完全支持Tailwind CSS的 `@apply` 指令和所有功能类：

```css
.imageZoomContainer {
  @apply relative;
}

.primaryButton {
  @apply bg-primary text-primary-foreground px-4 py-2 rounded-md;
  @apply hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary;
}

.responsiveGrid {
  @apply grid grid-cols-1 gap-4;
  @apply md:grid-cols-2 lg:grid-cols-3;
}
```

### Tailwind CSS v4 现代语法优化

#### 1. 尺寸属性简化
使用 `size-*` 替代 `h-* w-*` 的重复写法：

```css
/* ❌ 旧写法：重复的高度和宽度 */
.iconOld {
  @apply h-4 w-4;
}

.avatarOld {
  @apply h-10 w-10 rounded-full;
}

/* ✅ 新写法：使用 size-* 简化 */
.iconNew {
  @apply size-4;
}

.avatarNew {
  @apply size-10 rounded-full;
}

.buttonIcon {
  @apply size-5 text-muted-foreground;
}
```

#### 2. 逻辑属性支持
使用逻辑属性提升国际化支持：

```css
.cardContent {
  /* 传统物理属性 */
  @apply ml-4 mr-2 pl-6 pr-4;

  /* 现代逻辑属性 - 自动适配RTL */
  @apply ms-4 me-2 ps-6 pe-4;
}

.textAlignment {
  /* 逻辑对齐 */
  @apply text-start; /* 替代 text-left */
}
```

#### 3. 现代间距和尺寸语法
Tailwind v4 提供更直观的尺寸和间距控制：

```css
.modernSpacing {
  /* 使用 size-* 统一设置宽高 */
  @apply size-12; /* 等同于 h-12 w-12 */

  /* 使用 square-* 创建正方形 */
  @apply square-8; /* 创建 8x8 的正方形 */

  /* 使用 circle-* 创建圆形 */
  @apply circle-6; /* 创建直径为 6 的圆形 */
}

.iconButton {
  @apply size-10 rounded-md bg-secondary;
  @apply hover:bg-secondary/80 focus:ring-2 focus:ring-ring;

  & svg {
    @apply size-4; /* 图标尺寸 */
  }
}
```

#### 4. 增强的颜色系统
利用v4的颜色透明度和混合功能：

```css
.modernColors {
  /* 颜色透明度简化 */
  @apply bg-primary/10 text-primary/90;
  @apply border-primary/20 hover:bg-primary/15;

  /* 动态颜色变量 */
  @apply bg-[color-mix(in_srgb,theme(colors.primary)_80%,transparent)];
}
```

### 现代CSS语法支持

#### 1. CSS嵌套
利用现代CSS嵌套语法简化代码结构：

```css
.cardContainer {
  @apply bg-card rounded-lg p-6;

  & .cardTitle {
    @apply text-xl font-semibold mb-2;
  }

  & .cardContent {
    @apply text-muted-foreground;

    & p {
      @apply mb-4 last:mb-0;
    }
  }

  &:hover {
    @apply shadow-lg transform scale-105;
  }
}
```

#### 2. CSS自定义属性（CSS Variables）
结合Tailwind的设计令牌使用CSS变量：

```css
.themeAwareComponent {
  @apply bg-background text-foreground;

  --component-spacing: theme(spacing.4);
  --component-radius: theme(borderRadius.md);

  padding: var(--component-spacing);
  border-radius: var(--component-radius);
}
```

#### 3. 容器查询
使用现代容器查询实现组件级响应式设计：

```css
.adaptiveCard {
  @apply bg-card rounded-lg p-4;
  container-type: inline-size;

  & .cardLayout {
    @apply flex flex-col gap-4;
  }
}

@container (min-width: 300px) {
  .adaptiveCard .cardLayout {
    @apply flex-row items-center;
  }
}
```

## 全局样式处理

### 使用 :global() 选择器
当需要影响第三方组件或全局元素时：

```css
.dialogStyles {
  @apply fixed inset-0;

  & :global(::backdrop) {
    @apply hidden;
  }

  &:global([open]) {
    @apply flex items-center justify-center;
  }
}

.componentWrapper {
  @apply relative;

  /* 影响子组件的特定数据属性 */
  & :global([data-state="open"]) {
    @apply opacity-100 scale-100;
  }

  & :global([data-state="closed"]) {
    @apply opacity-0 scale-95;
  }
}
```

## 媒体查询和响应式设计

### 结合Tailwind断点
```css
.responsiveComponent {
  @apply p-4;

  /* 自定义媒体查询 */
  @media (min-width: theme(screens.md)) {
    @apply p-6;
  }

  /* 或直接使用Tailwind类 */
  @apply md:p-6 lg:p-8;
}

/* 偏好设置查询 */
@media (prefers-reduced-motion: reduce) {
  .animatedElement {
    @apply transition-none;
  }
}

@media (prefers-color-scheme: dark) {
  .autoThemeComponent {
    @apply bg-gray-900 text-gray-100;
  }
}
```

## 组件集成模式

### TypeScript集成
```typescript
import styles from './component.module.css'
import { cn } from '@/lib/utils'

type ComponentProps = {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Component({ variant = 'primary', size = 'md', className }: ComponentProps) {
  return (
    <div
      className={cn(
        styles.baseComponent,
        styles[variant],
        styles[size],
        className
      )}
    >
      Content
    </div>
  )
}
```

对应的CSS：
```css
.baseComponent {
  @apply inline-flex items-center justify-center rounded-md font-medium;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.primary {
  @apply bg-primary text-primary-foreground;
  @apply hover:bg-primary/90 focus:ring-primary;
}

.secondary {
  @apply bg-secondary text-secondary-foreground;
  @apply hover:bg-secondary/80 focus:ring-secondary;
}

.sm {
  @apply px-3 py-1.5 text-sm;
}

.md {
  @apply px-4 py-2 text-base;
}

.lg {
  @apply px-6 py-3 text-lg;
}
```

## 性能优化建议

### 1. 避免深层嵌套
```css
/* ❌ 避免过深嵌套 */
.container {
  & .wrapper {
    & .content {
      & .item {
        & .text {
          @apply text-sm;
        }
      }
    }
  }
}

/* ✅ 推荐：扁平化结构 */
.container {
  @apply p-4;
}

.containerContent {
  @apply space-y-4;
}

.containerItem {
  @apply flex items-center gap-2;
}

.itemText {
  @apply text-sm text-muted-foreground;
}
```

### 2. 合理使用@apply
```css
/* ✅ 推荐：将常用组合抽象为语义化类 */
.buttonBase {
  @apply inline-flex items-center justify-center rounded-md font-medium;
  @apply transition-colors focus:outline-none focus:ring-2;
}

.inputBase {
  @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2;
  @apply text-sm ring-offset-background placeholder:text-muted-foreground;
  @apply focus:ring-2 focus:ring-ring focus:ring-offset-2;
}
```

## 调试和开发工具

### 开发时的类名调试
```css
.debugComponent {
  @apply bg-red-100 border border-red-500;

  /* 开发环境下的调试样式 */
  &[data-debug="true"] {
    @apply outline outline-2 outline-yellow-500;
  }
}
```

## 最佳实践总结

1. **保持语义化**：类名应反映组件的功能而非外观
2. **充分利用Tailwind**：优先使用`@apply`指令而非原生CSS属性
3. **现代语法优先**：使用CSS嵌套、容器查询等现代特性
4. **响应式设计**：结合Tailwind断点和自定义媒体查询
5. **类型安全**：在TypeScript中正确导入和使用样式对象
6. **性能考虑**：避免过度嵌套，合理组织样式结构
7. **全局样式谨慎使用**：仅在必要时使用`:global()`选择器

### Tailwind v4 特定优化建议

8. **使用简化尺寸语法**：
   - 优先使用 `size-*` 替代 `h-* w-*`
   - 使用 `square-*` 和 `circle-*` 创建规则形状
   - 利用逻辑属性 `ms-*`, `me-*`, `ps-*`, `pe-*` 提升国际化支持

9. **现代颜色处理**：
   - 使用颜色透明度语法 `bg-primary/10`
   - 利用 `color-mix()` 函数创建动态颜色
   - 避免硬编码颜色值，使用设计令牌

10. **AI编码优化提示**：
    ```css
    /* ❌ AI常见的冗余写法 */
    .oldStyle {
      @apply h-4 w-4 ml-2 mr-2;
    }

    /* ✅ 现代简化写法 */
    .newStyle {
      @apply size-4 mx-2;
    }
    ```

通过遵循这些指导原则，可以创建既现代又可维护的CSS Modules代码，充分发挥Tailwind CSS v4的优势同时保持组件样式的封装性。
