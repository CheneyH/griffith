import * as displayIcons from './icons/display/index'
import * as controllerIcons from './icons/controller/index'
import {useEffect, useContext} from 'react'
import clamp from 'lodash/clamp'
import useHandler from '../hooks/useHandler'
import {useActionToastDispatch} from './ActionToast'
import VideoSourceContext from '../contexts/VideoSourceContext'

type Options = {
  root: HTMLDivElement | null
  prevVolumeRef: React.MutableRefObject<number>
  isPlaying: boolean
  isPageFullScreen: boolean
  duration: number
  volume: number
  currentTime: number
  standalone?: boolean
  onVolumeChange: (value: number) => void
  onTogglePlay: () => void
  onToggleFullScreen: () => void
  onTogglePageFullScreen: () => void
  onSeek: (currentTime: number) => void
}

const isInput = (el: HTMLElement) =>
  /^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable

const usePlayerShortcuts = ({
  root,
  prevVolumeRef,
  isPlaying,
  isPageFullScreen,
  volume,
  duration,
  currentTime,
  standalone,
  onVolumeChange,
  onTogglePlay,
  onToggleFullScreen,
  onTogglePageFullScreen,
  onSeek,
}: Options) => {
  const actionToastDispatch = useActionToastDispatch()
  const {playbackRates, currentPlaybackRate, setCurrentPlaybackRate} =
    useContext(VideoSourceContext)

  const rotatePlaybackRate = (dir: 'next' | 'prev') => {
    const index = playbackRates?.findIndex(
      (x) => x.value === currentPlaybackRate.value
    )
    if (index >= 0) {
      const next = playbackRates[index + (dir === 'next' ? 1 : -1)]
      actionToastDispatch({
        icon: displayIcons.play,
        label: (next || currentPlaybackRate).text,
      })
      if (next) {
        setCurrentPlaybackRate(next)
      }
    }
  }

  const handleVolumeChange = useHandler((value: number, showToast = false) => {
    value = clamp(value, 0, 1)
    if (showToast) {
      actionToastDispatch({
        icon: value ? controllerIcons.volume : controllerIcons.muted,
        label: `${(value * 100).toFixed(0)}%`,
      })
    }
    onVolumeChange?.(value)
  })

  const handleSeek = useHandler((currentTime: number) => {
    onSeek(clamp(currentTime, 0, duration))
  })

  const handleKeyDown = useHandler((event: KeyboardEvent) => {
    // 防止事件已经在别处被处理过（如 Slider 中）
    if (event.defaultPrevented) {
      return
    }

    // 防止冲突，有修饰键按下时不触发自定义热键
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return
    }

    if (event.target && isInput(event.target as HTMLElement)) {
      return
    }

    let handled = true
    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        actionToastDispatch({
          icon: isPlaying ? displayIcons.pause : displayIcons.play,
        })
        onTogglePlay()
        break

      case 'f':
      case 'F':
        onToggleFullScreen()
        break
      case 'Escape':
        if (isPageFullScreen) {
          onTogglePageFullScreen()
        }
        break

      case 'ArrowLeft':
        handleSeek(currentTime - 5)
        break

      case 'ArrowRight':
        handleSeek(currentTime + 5)
        break

      case 'ArrowUp':
        // 可能静音状态调整时不切换为非静音会更好（设置临时状态，恢复音量时应用临时状态）
        handleVolumeChange(volume + 0.05, true)
        break

      case 'ArrowDown':
        handleVolumeChange(volume - 0.05, true)
        break

      case 'j':
      case 'J':
        handleSeek(currentTime - 10)
        break

      case 'l':
      case 'L':
        handleSeek(currentTime + 10)
        break
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        handleSeek((duration / 10) * Number(event.key))
        break

      case 'm':
      case 'M':
        handleVolumeChange(volume ? 0 : prevVolumeRef.current, true)
        break

      case '<':
        rotatePlaybackRate('prev')
        break

      case '>':
        rotatePlaybackRate('next')
        break

      default:
        handled = false
        break
    }
    if (handled) {
      event.preventDefault()
    }
  })

  useEffect(() => {
    // 对于 React 16，需要使用 document 来处理冒泡（17 之后任何上层元素都能正常冒泡）
    if (standalone) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    } else if (root) {
      root.addEventListener('keydown', handleKeyDown)
      return () => {
        root.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [handleKeyDown, root, standalone])
}

export default usePlayerShortcuts
