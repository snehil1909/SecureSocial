import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as SocketServer } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketServer
    }
  }
} 