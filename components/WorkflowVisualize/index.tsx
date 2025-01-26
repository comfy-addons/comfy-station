import React, { useEffect, useMemo } from 'react'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { applyLayout, transformEdges, transformNodes } from './tools'
import useDarkMode from '@/hooks/useDarkmode'
import { EHighlightType, useWorkflowVisStore } from './state'

export const WorkflowVisualize: IComponent<{
  workflow: IWorkflow
}> = ({ workflow }) => {
  const { highlightArr, setRecenterFn } = useWorkflowVisStore()
  const isDark = useDarkMode()
  const reactFlowInstance = useReactFlow()

  const [edges, setEdges, onEdgesChange] = useEdgesState(transformEdges(workflow))
  const [nodes, setNodes, onNodesChange] = useNodesState(applyLayout(transformNodes(workflow), edges))

  const zoomToNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      const { x, y } = node.position
      reactFlowInstance.setCenter(x, y, { zoom: 1.5, duration: 800 })
    }
  }

  useEffect(() => {
    setRecenterFn(() => {
      reactFlowInstance.fitView({
        duration: 800
      })
    })
  }, [reactFlowInstance, setRecenterFn])

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const hlData = highlightArr
          ?.sort((a, b) => {
            // PROCESSING have highest order
            if (a.processing) return -1
            return b.type - a.type
          })
          .find((hl) => hl.id === node.id)
        let borderColor = undefined
        if (hlData?.processing) {
          borderColor = '#F87171'
          zoomToNode(node.id)
        } else {
          switch (hlData?.type) {
            case EHighlightType.INPUT:
              borderColor = '#10B981'
              break
            case EHighlightType.OUTPUT:
              // Blue
              borderColor = '#3B82F6'
              break
            case EHighlightType.SELECTING:
              borderColor = '#F59E0B'
              zoomToNode(node.id)
              break
            default:
              break
          }
        }
        return {
          ...node,
          style: {
            ...node.style,
            borderColor
          }
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightArr])

  useEffect(() => {
    setNodes((nds) => applyLayout(nds, edges))
  }, [edges, setNodes])

  return (
    <div className='w-full h-full relative'>
      <div className='absolute z-10 top-4 left-4 border p-2 rounded-full flex gap-4 bg-background/80'>
        <div className='flex gap-1 items-center text-xs'>
          <div className='w-2 h-min aspect-square bg-[#10B981] rounded-full' />
          <span>INPUT</span>
        </div>
        <div className='flex gap-1 items-center text-xs'>
          <div className='w-2 h-min aspect-square bg-[#3B82F6] rounded-full' />
          <span>OUTPUT</span>
        </div>
        <div className='flex gap-1 items-center text-xs'>
          <div className='w-2 h-min aspect-square bg-[#F59E0B] rounded-full' />
          <span>SELECTING</span>
        </div>
        <div className='flex gap-1 items-center text-xs'>
          <div className='w-2 h-min aspect-square bg-[#F87171] rounded-full' />
          <span>PROCESSING</span>
        </div>
      </div>
      <ReactFlow nodes={nodes} edges={edges} fitView colorMode={isDark ? 'dark' : 'light'}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
