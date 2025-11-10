#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Kill processes running on specified ports
 * Usage: tsx scripts/kill-port.ts 3000 3001 8080
 */

interface ProcessInfo {
  pid: number
  port: number
  process: string
}

async function findProcessOnPort(port: number): Promise<ProcessInfo[]> {
  try {
    // Windows command to find processes using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`)

    const lines = stdout.trim().split('\n')
    const processes: ProcessInfo[] = []

    for (const line of lines) {
      // Parse netstat output
      // Example: TCP    127.0.0.1:3000     0.0.0.0:0     LISTENING       12345
      const match = line.match(/:\s*(\d+)\s+.*LISTENING\s+(\d+)/)
      if (match) {
        const portNum = parseInt(match[1])
        const pid = parseInt(match[2])

        if (portNum === port) {
          try {
            // Get process name
            const { stdout: processName } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
            const process = processName.split(',')[0].replace(/"/g, '')

            processes.push({
              pid,
              port: portNum,
              process
            })
          } catch {
            // If we can't get the process name, still include the PID
            processes.push({
              pid,
              port: portNum,
              process: 'Unknown'
            })
          }
        }
      }
    }

    return processes
  } catch (error) {
    // Command failed (likely no process on this port)
    return []
  }
}

async function killProcess(pid: number): Promise<boolean> {
  try {
    await execAsync(`taskkill /F /PID ${pid}`)
    return true
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error)
    return false
  }
}

async function killPorts(ports: number[]): Promise<void> {
  console.log('🔍 Searching for processes on ports:', ports.join(', '))

  let totalKilled = 0

  for (const port of ports) {
    const processes = await findProcessOnPort(port)

    if (processes.length === 0) {
      console.log(`✅ Port ${port}: No process found`)
      continue
    }

    console.log(`\n🎯 Port ${port}: Found ${processes.length} process(es):`)

    for (const process of processes) {
      console.log(`   - PID ${process.pid} (${process.process})`)

      const killed = await killProcess(process.pid)
      if (killed) {
        console.log(`   ✅ Killed PID ${process.pid}`)
        totalKilled++
      } else {
        console.log(`   ❌ Failed to kill PID ${process.pid}`)
      }
    }
  }

  if (totalKilled > 0) {
    console.log(`\n🎉 Successfully killed ${totalKilled} process(es)`)
  } else {
    console.log('\n✨ No processes to kill')
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log(`
❌ Error: No ports specified

Usage: tsx scripts/kill-port.ts <port1> [port2] [port3] ...

Examples:
  tsx scripts/kill-port.ts 3000
  tsx scripts/kill-port.ts 3000 3001 8080
  tsx scripts/kill-port.ts 3000-3005

Note: This script works on Windows. For other platforms, modify the commands accordingly.
`)
  process.exit(1)
}

// Parse ports (support ranges like 3000-3005)
const ports: number[] = []

for (const arg of args) {
  if (arg.includes('-')) {
    // Handle port range
    const [start, end] = arg.split('-').map(p => parseInt(p))
    if (!isNaN(start) && !isNaN(end)) {
      for (let i = start; i <= end; i++) {
        ports.push(i)
      }
    }
  } else {
    // Handle single port
    const port = parseInt(arg)
    if (!isNaN(port)) {
      ports.push(port)
    }
  }
}

if (ports.length === 0) {
  console.log('❌ Error: No valid ports specified')
  process.exit(1)
}

// Run the script
killPorts(ports).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})