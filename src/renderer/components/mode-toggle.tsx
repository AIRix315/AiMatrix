import { Moon, Sun } from "lucide-react"
import { Button } from "@/renderer/components/ui/button"
import { useTheme } from "@/renderer/components/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // 在 light 和 dark 之间切换（不使用 system）
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  return (
    <Button variant="outline" size="lg" onClick={toggleTheme}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="ml-2">
        {theme === "dark" ? "浅色" : "深色"}
      </span>
    </Button>
  )
}
