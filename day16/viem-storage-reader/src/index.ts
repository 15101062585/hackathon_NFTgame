import { readAllLocks } from './readLocks.js'

async function main() {
  console.log('🚀 Starting Viem Storage Reader...')
  
  try {
    await readAllLocks()
  } catch (error) {
    console.error('💥 Application failed:', error)
    process.exit(1)
  }
}

// 运行主函数
main()