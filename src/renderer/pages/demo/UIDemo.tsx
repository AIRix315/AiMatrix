import React from 'react';
import { Button } from '@/renderer/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { Switch } from '@/renderer/components/ui/switch';
import { Badge } from '@/renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/renderer/components/ui/alert';
import { Separator } from '@/renderer/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/renderer/components/ui/tabs';
import { ModeToggle } from '@/renderer/components/mode-toggle';
import {
  Home, Search, Settings, User, Mail, Bell, Calendar,
  Download, Upload, Trash2, Edit, Save, X, Check,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Plus, Minus, Heart, Star
} from 'lucide-react';

/**
 * shadcn/ui 组件演示页面
 * 展示新迁移的 UI 组件库的使用方法
 */
export default function UIDemo() {
  const [inputValue, setInputValue] = React.useState('');
  const [isChecked, setIsChecked] = React.useState(false);
  const [isSwitchOn, setIsSwitchOn] = React.useState(false);

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground">
      <div className="p-8 space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">shadcn/ui 组件演示</h1>
          <p className="text-muted-foreground">
            这是一个展示 shadcn/ui 组件库的演示页面
          </p>
        </div>
        <ModeToggle />
      </div>

      {/* Button 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Button 按钮</CardTitle>
          <CardDescription>
            不同变体和尺寸的按钮组件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">⚙</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled Outline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Card 卡片</CardTitle>
          <CardDescription>
            卡片组件可以包含标题、描述、内容和底部操作区
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">项目 A</CardTitle>
                <CardDescription>这是一个简单的卡片示例</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  卡片内容可以包含任何 React 组件或 HTML 元素。
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  查看详情
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">项目 B</CardTitle>
                <CardDescription>另一个卡片示例</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  支持多种布局和嵌套使用。
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="default" size="sm">
                  确定
                </Button>
                <Button variant="ghost" size="sm">
                  取消
                </Button>
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Input 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Input 输入框</CardTitle>
          <CardDescription>
            各种类型的输入框组件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">标准输入框</label>
            <Input
              placeholder="请输入内容..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            {inputValue && (
              <p className="text-sm text-muted-foreground">
                当前输入: {inputValue}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">邮箱输入</label>
            <Input type="email" placeholder="email@example.com" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">密码输入</label>
            <Input type="password" placeholder="••••••••" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">禁用状态</label>
            <Input disabled placeholder="禁用的输入框" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">文件上传</label>
            <Input type="file" />
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Label、Checkbox、Switch 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>表单控件</CardTitle>
          <CardDescription>
            Label、Checkbox 和 Switch 组件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Checkbox 复选框</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked as boolean)}
                />
                <Label htmlFor="terms" className="cursor-pointer">
                  我同意服务条款和隐私政策
                </Label>
              </div>
              {isChecked && (
                <p className="text-sm text-muted-foreground mt-2 ml-6">
                  ✓ 已同意条款
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Switch 开关</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={isSwitchOn}
                  onCheckedChange={setIsSwitchOn}
                />
                <Label htmlFor="notifications" className="cursor-pointer">
                  启用通知推送
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2 ml-11">
                {isSwitchOn ? '✓ 已启用' : '✗ 已禁用'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Label 标签</h3>
              <div className="space-y-2">
                <Label htmlFor="email-demo">邮箱地址</Label>
                <Input id="email-demo" type="email" placeholder="your@email.com" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Badge 徽章</CardTitle>
          <CardDescription>
            用于标记和分类的徽章组件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">状态:</span>
              <Badge variant="secondary">进行中</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">优先级:</span>
              <Badge variant="destructive">高</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">版本:</span>
              <Badge variant="outline">v0.2.9.5</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Icon 图标演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Icons 图标 (Lucide React)</CardTitle>
          <CardDescription>
            shadcn/ui 推荐使用 Lucide React 图标库，提供 1000+ 精美图标
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">常用图标</h3>
            <div className="flex flex-wrap gap-4">
              <Home className="h-6 w-6" />
              <Search className="h-6 w-6" />
              <Settings className="h-6 w-6" />
              <User className="h-6 w-6" />
              <Mail className="h-6 w-6" />
              <Bell className="h-6 w-6" />
              <Calendar className="h-6 w-6" />
              <Download className="h-6 w-6" />
              <Upload className="h-6 w-6" />
              <Trash2 className="h-6 w-6" />
              <Edit className="h-6 w-6" />
              <Save className="h-6 w-6" />
              <X className="h-6 w-6" />
              <Check className="h-6 w-6" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">图标与按钮组合</h3>
            <div className="flex flex-wrap gap-2">
              <Button>
                <Home className="mr-2 h-4 w-4" />
                首页
              </Button>
              <Button variant="secondary">
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                下载
              </Button>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">方向图标</h3>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">不同尺寸</h3>
            <div className="flex items-center gap-4">
              <Star className="h-4 w-4 text-yellow-500" />
              <Star className="h-6 w-6 text-yellow-500" />
              <Star className="h-8 w-8 text-yellow-500" />
              <Star className="h-12 w-12 text-yellow-500" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">图标颜色</h3>
            <div className="flex items-center gap-4">
              <Heart className="h-6 w-6 text-red-500" />
              <Star className="h-6 w-6 text-yellow-500" />
              <Check className="h-6 w-6 text-green-500" />
              <Mail className="h-6 w-6 text-blue-500" />
              <Bell className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Alert 提示</CardTitle>
          <CardDescription>
            用于显示重要信息的警告提示组件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              这是一个默认样式的提示信息，用于显示一般性通知。
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>
              您的操作失败了，请检查输入并重试。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs 演示 */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs 选项卡</CardTitle>
          <CardDescription>
            用于组织和切换不同内容的选项卡组件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account">账户</TabsTrigger>
              <TabsTrigger value="password">密码</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" placeholder="请输入用户名" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-tab">邮箱</Label>
                <Input id="email-tab" type="email" placeholder="your@email.com" />
              </div>
              <Button>保存账户信息</Button>
            </TabsContent>
            <TabsContent value="password" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input id="new-password" type="password" />
              </div>
              <Button>修改密码</Button>
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications-tab">推送通知</Label>
                <Switch id="notifications-tab" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="marketing">营销邮件</Label>
                <Switch id="marketing" />
              </div>
              <Button>保存设置</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* 组合使用示例 */}
      <Card>
        <CardHeader>
          <CardTitle>登录表单示例</CardTitle>
          <CardDescription>
            组合使用 Input 和 Button 创建表单
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名</label>
            <Input placeholder="请输入用户名" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <Input type="password" placeholder="请输入密码" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button className="w-full">登录</Button>
          <Button variant="outline" className="w-full">
            注册
          </Button>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
