/**
 * @fileoverview
 * Legend State 状态管理模式指南
 *
 * 核心模式：
 * - 使用 create-context-provider.tsx 创建 Provider/Hook 对
 * - 将 state 和 action 提升到 Provider 中供下游组件使用
 * - 几乎消息了 react hooks 和依赖数组: useMemo, useCallback, useEffect
 * - 在 action 和事件 handler 中使用 peek() 读取状态, 使用 set 和 assign 修改状态
 * - 使用 use$ 选择状态
 * - 使用 For / Show / Memo 将 re-render scope 隔离在叶节点. 组件保持稳定
 */
import type { Observable } from '@legendapp/state'
import { createContextProvider } from '@/lib/create-context-provider'
import { observable, syncState } from '@legendapp/state'
import { For, Memo, Show, use$ } from '@legendapp/state/react'
import { Suspense } from 'react'
import { ulid } from 'ulid'

// ================================================================================================
// 1. 基础状态管理模式
// ================================================================================================
type Todo = {
  id: string
  text: string
  completed: boolean
}
type TodoState = {
  todos: Array<Todo>
  filter: 'all' | 'active' | 'completed'
}

// 将组件树的状态提升到 Provider 中
const [TodoProvider, useTodo] = createContextProvider(
  (props: { initialValues?: Todo[] }) => {
    const state$ = observable<TodoState>({
      todos: props.initialValues ?? [],
      filter: 'all',
    })

    // Actions
    const addTodo = (text: string) => {
      state$.todos.push({
        id: ulid(),
        text,
        completed: false,
      })
    }

    const toggleTodo = (id: string) => {
      const todo = state$.todos.find((t) => t.id.peek() === id)
      if (todo) {
        // Observable<boolean> 可以调用 toggle 方法
        todo.completed.toggle()
      }
    }

    // Computed
    const filteredTodos$ = observable(() => {
      const todos = state$.todos.get()
      const filter = state$.filter.get()

      switch (filter) {
        case 'active':
          return todos.filter((todo) => !todo.completed)
        case 'completed':
          return todos.filter((todo) => todo.completed)
        default:
          return todos
      }
    })

    return {
      state$,
      filteredTodos$,
      addTodo,
      toggleTodo,
    }
  },
)

// Root Component
export function TodoApp() {
  return (
    <TodoProvider>
      <TodoList />
      <TodoFilters />
    </TodoProvider>
  )
}

// Child Component - 粗粒度订阅
function TodoList() {
  const { filteredTodos$, toggleTodo } = useTodo()
  const todos = use$(filteredTodos$)

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  )
}

// Child Component - 细粒度订阅
function TodoFilters() {
  const { state$ } = useTodo()
  const filter = use$(state$.filter)

  return (
    <div>
      {(['all', 'active', 'completed'] as const).map((f) => (
        <button
          key={f}
          onClick={() => state$.filter.set(f)}
          disabled={filter === f}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

type Message = {
  id: string
  text: string
  timestamp: number
  read: boolean
}

type MessageState = {
  messages: Array<Message>
}

const [MessageProvider, useMessage] = createContextProvider(() => {
  const state$ = observable<MessageState>({
    messages: [],
  })

  const markAsRead = (id: string) => {
    const message = state$.messages.find((m) => m.id.peek() === id)
    if (message) {
      message.read.set(true)
    }
  }

  return { state$, markAsRead }
})

// 使用 For 组件优化列表渲染
function MessageList() {
  const { state$ } = useMessage()

  return (
    <div>
      <For each={state$.messages}>
        {(message$) => <MessageItem message$={message$} />}
      </For>
    </div>
  )
}

// 每个列表项独立订阅，只在自身数据变化时重渲染
function MessageItem({ message$ }: { message$: Observable<Message> }) {
  const { markAsRead } = useMessage()

  const { id, text, read } = use$(message$)

  return (
    <div onClick={() => markAsRead(id)}>
      {text}
      {!read && <span>●</span>}
    </div>
  )
}

// ================================================================================================
// 3. 稳定组件可以避免代码被大量 useMemo useCallback 污染
// ================================================================================================

type WebSocketState = {
  state: 'disconnected' | 'connected'
  lastMessage: string | null
}

const [WebSocketProvider, useWebSocket] = createContextProvider(() => {
  const state$ = observable<WebSocketState>({
    state: 'disconnected',
    lastMessage: null,
  })

  // WebSocket 实例稳定，不会因为重渲染而重建
  const ws = new WebSocket('wss://example.com')

  ws.onopen = () => state$.state.set('connected')
  ws.onclose = () => state$.state.set('disconnected')
  ws.onmessage = (e) => state$.lastMessage.set(e.data)

  const sendMessage = (msg: string) => {
    if (state$.state.peek() === 'connected') {
      ws.send(msg)
    }
  }

  return { state$, sendMessage }
})

// 稳定组件 - 绝对不重渲染
function WebSocketStatus() {
  const { state$ } = useWebSocket()

  // 将响应式逻辑隔离在 Memo 内部
  return (
    <div className="websocket-status">
      <Memo>
        {() => {
          const state = state$.state.get()
          const label = state === 'connected' ? '已连接' : '未连接'
          const className = state === 'connected' ? 'connected' : 'disconnected'
          return <span className={className}>{label}</span>
        }}
      </Memo>
      <Show if={state$.lastMessage}>
        {(lastMessage) => (
          <div>
            <div>最新消息: {lastMessage}</div>
          </div>
        )}
      </Show>
    </div>
  )
}

type AppState = {
  user: {
    name: string
    email: string
  } | null
  settings: {
    theme: 'light' | 'dark'
    language: string
  }
  items: Array<{
    id: string
    title: string
    done: boolean
  }>
}

const [AppProvider, useApp] = createContextProvider(() => {
  const state$ = observable<AppState>({
    user: null,
    settings: {
      theme: 'light',
      language: 'zh',
    },
    items: [],
  })

  // Actions - 使用 peek() 读取，set/assign 修改
  function login(email: string, password: string) {
    // 读取当前值不创建依赖
    const currentTheme = state$.settings.theme.peek()

    // 设置单个值
    state$.user.set({ name: 'User', email })

    // 批量更新多个字段
    state$.settings.assign({
      theme: 'dark',
      language: 'en',
    })
  }

  function addItem(title: string) {
    state$.items.push({
      id: crypto.randomUUID(),
      title,
      done: false,
    })
  }

  function toggleItem(id: string) {
    const item = state$.items.find((i) => i.id.peek() === id)
    if (item) {
      item.done.toggle()
    }
  }

  // Computed - 派生状态
  const completedCount$ = observable(
    () => state$.items.get().filter((item) => item.done).length,
  )

  return {
    state$,
    completedCount$,
    login,
    addItem,
    toggleItem,
  }
})

// ================================================================================================
// 组件使用模式
// ================================================================================================

// Root
function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )
}

// 粗粒度订阅 - 简单直接，不过早优化
function Dashboard() {
  const { state$, login } = useApp()
  const state = use$(state$) // 整个 state 变化都会重渲染

  if (!state.user) {
    return <button onClick={() => login('test@example.com', '')}>Login</button>
  }

  return (
    <div>
      <h1>Welcome {state.user.name}</h1>
      <p>Theme: {state.settings.theme}</p>
      <UserProfile />
    </div>
  )
}

// 只有 selector 需要的字段变化时组件会 re-render
function UserProfile() {
  const { state$ } = useApp()
  const user = use$(state$.user)
  const theme = use$(state$.settings.theme)

  if (!user) return null

  return (
    <div className={theme}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}

// 细粒度优化 - 使用 Memo 隔离重渲染, 在大多数情意下不需要这种级别的优化, 除非你想让组件 100% 稳定
function ItemList() {
  const { state$, toggleItem } = useApp()

  // 组件主体稳定，不会因为 items 变化而重渲染
  return (
    <div className="item-list">
      <h3>Todo Items</h3>

      {/* 将响应式逻辑隔离在 Memo 内部 */}
      <Memo>
        {() => {
          const items = state$.items.get()
          return <div>Total: {items.length}</div>
        }}
      </Memo>

      {/* 使用 For 优化列表渲染 */}
      <For each={state$.items}>
        {(item$, id) => (
          <div key={id} onClick={() => toggleItem(item$.id.peek())}>
            <Memo>{() => (item$.done.get() ? '✓' : '○')}</Memo>
            <Memo>{item$.title}</Memo>
          </div>
        )}
      </For>
    </div>
  )
}

// ================================================================================================
// 常用模式示例
// ================================================================================================

// 条件渲染
function ConditionalExample() {
  const { state$ } = useApp()

  return (
    <div>
      {/* Show 组件处理条件渲染 */}
      <Show if={state$.user} else={<div>Please login</div>}>
        {(user) => <div>Welcome {user?.name}</div>}
      </Show>

      {/* 嵌套 Memo 实现部分更新 */}
      <div className="status-bar">
        <span>状态栏（稳定）</span>
        <Memo>{() => <span>在线人数: {Math.random()}</span>}</Memo>
      </div>
    </div>
  )
}

// 直接创建异步 observable
const userData$ = observable(() =>
  fetch('/api/user').then<{ id: string; name: string }>((res) => res.json()),
)

// 异步渲染
function UserDataExampleAsync() {
  const userData = use$(userData$)
  return <div>User: {userData.name}</div>
}

// 转成同步状态
const userDataSync$ = syncState(userData$)
function UserDataExampleSync() {
  // 方式2: 使用 syncState 获取状态

  const state = use$(userDataSync$)

  if (state.error) {
    return <div>Error: {state.error.message}</div>
  }

  if (!state.isLoaded) {
    return <div>Loading...</div>
  }

  const data = userData$.peek()

  return <div>User: {data?.name}</div>
}

function UserDataExampleRoot() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserDataExampleAsync />
      </Suspense>
      <UserDataExampleSync />
    </div>
  )
}
