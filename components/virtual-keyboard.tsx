"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"

interface VirtualKeyboardProps {
  onInput: (value: string) => void
  maxLength?: number
  disabled?: boolean
}

export default function VirtualKeyboard({ onInput, maxLength = 20, disabled = false }: VirtualKeyboardProps) {
  const [value, setValue] = useState("")
  const [keys, setKeys] = useState<string[]>([])
  const [showSpecial, setShowSpecial] = useState(false)

  // Generate shuffled keys
  const generateKeys = () => {
    const numbers = "0123456789".split("")
    const letters = "abcdefghijklmnopqrstuvwxyz".split("")
    const specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?/".split("")

    // Shuffle arrays
    const shuffledNumbers = [...numbers].sort(() => Math.random() - 0.5)
    const shuffledLetters = [...letters].sort(() => Math.random() - 0.5)
    const shuffledSpecial = [...specialChars].sort(() => Math.random() - 0.5)

    return showSpecial ? shuffledSpecial : [...shuffledNumbers, ...shuffledLetters]
  }

  useEffect(() => {
    setKeys(generateKeys())
  }, [showSpecial])

  const handleKeyClick = (key: string) => {
    if (disabled) return

    if (value.length < maxLength) {
      const newValue = value + key
      setValue(newValue)
      onInput(newValue)
    }
  }

  const handleBackspace = () => {
    if (disabled) return

    const newValue = value.slice(0, -1)
    setValue(newValue)
    onInput(newValue)
  }

  const handleClear = () => {
    if (disabled) return

    setValue("")
    onInput("")
  }

  const handleToggleSpecial = () => {
    if (disabled) return

    setShowSpecial(!showSpecial)
  }

  const handleShuffleKeys = () => {
    if (disabled) return

    setKeys(generateKeys())
  }

  return (
    <div className={`p-2 border rounded-md ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-2 flex justify-between items-center">
        <div className="text-sm font-medium">Virtual Keyboard</div>
        <div className="flex space-x-1">
          <Button variant="outline" size="sm" onClick={handleToggleSpecial} disabled={disabled}>
            {showSpecial ? "ABC" : "#@!"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShuffleKeys} disabled={disabled}>
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-1">
        {keys.map((key, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleKeyClick(key)}
            disabled={disabled}
          >
            {key}
          </Button>
        ))}
      </div>

      <div className="mt-2 flex justify-between">
        <Button variant="outline" size="sm" className="px-2" onClick={handleBackspace} disabled={disabled}>
          Backspace
        </Button>
        <Button variant="outline" size="sm" className="px-2" onClick={handleClear} disabled={disabled}>
          Clear
        </Button>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Password: {value.replace(/./g, "•")}</div>
    </div>
  )
}

