import { useQuery } from '@tanstack/react-query'

import { orpc } from './orpc.client'

function Example() {
  // 轮询动画资产生成状态的示例
  const { data, isLoading, error } = useQuery({
    ...orpc.getAnimationAsset.queryOptions({
      input: {
        storyId: 'story-id-here',
      },
    }),

    // 轮询配置 - 如果还有待处理的资产，每 2 秒轮询一次
    refetchInterval: (query) => {
      return query.state.data?.pendingAssets &&
        query.state.data.pendingAssets > 0
        ? 2000
        : false
    },

    // 确保在窗口获得焦点时重新获取
    refetchOnWindowFocus: true,
  })

  return <div>{JSON.stringify(data, null, 2)}</div>
}
