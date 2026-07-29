import { createPinia } from 'pinia'
import persist from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(persist)

export default pinia

export * from './modules/favorites'
export * from './modules/auth'
export * from './modules/history'
export * from './modules/player'
