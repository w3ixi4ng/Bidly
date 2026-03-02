import type { Message } from '../types'

interface Props {
  message: Message
  isMine: boolean
}

export default function ChatMessage({ message, isMine }: Props) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
          isMine
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
        }`}
      >
        <p>{message.message}</p>
        {message.timestamp && (
          <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-zinc-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
