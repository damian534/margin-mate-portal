import { AppHeader } from '@/components/AppHeader';
import { AppSideNav } from '@/components/AppSideNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToolVisibility } from '@/hooks/useToolVisibility';
import { Settings, ChevronDown, Wrench } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TOOLS as tools } from '@/lib/toolsCatalog';
import { useState } from 'react';


export default function Tools() {
  const navigate = useNavigate();
  const { role, isBrokerOrAdmin } = useAuth();
  const { visibility, loading, toggleTool, isToolEnabled } = useToolVisibility();
  const [showAdmin, setShowAdmin] = useState(false);
  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex w-full items-start">
        <AppSideNav />
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Tools</h1>
            <p className="text-muted-foreground">
              Interactive calculators and resources for client conversations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Wrench className="w-4 h-4 mr-1" /> Select a tool
                  <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>All tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tools
                  .filter(tool => (isSuperAdmin || isToolEnabled(tool.id)) && (!tool.brokerOnly || isBrokerOrAdmin))
                  .map(tool => (
                    <DropdownMenuItem key={tool.id} onSelect={() => navigate(tool.path)}>
                      <tool.icon className="w-4 h-4 mr-2 shrink-0 text-primary" />
                      <span className="truncate">{tool.name}</span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowAdmin(!showAdmin)}>
                <Settings className="w-4 h-4 mr-1" /> {showAdmin ? 'Done' : 'Manage'}
              </Button>
            )}
          </div>
        </div>


        {showAdmin && isSuperAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tool Visibility</CardTitle>
              <CardDescription>Toggle tools on or off for all brokers and partners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map(tool => (
                <div key={tool.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <tool.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tool.name}</span>
                  </div>
                  <Switch
                    checked={isToolEnabled(tool.id)}
                    onCheckedChange={(checked) => toggleTool(tool.id, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools
            .filter(tool => (isSuperAdmin || isToolEnabled(tool.id)) && (!tool.brokerOnly || isBrokerOrAdmin))
            .map((tool, i) => {
              const enabled = isToolEnabled(tool.id);
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className={`h-full flex flex-col ${!enabled && isSuperAdmin ? 'opacity-50 border-dashed' : 'hover:shadow-md transition-shadow'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                          <tool.icon className="w-5 h-5 text-primary" />
                        </div>
                        {!enabled && isSuperAdmin && (
                          <Badge variant="secondary" className="text-xs">Hidden</Badge>
                        )}
                        {tool.brokerOnly && (
                          <Badge variant="outline" className="text-xs">Broker Only</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-0">
                      <Button
                        className="w-full"
                        onClick={() => navigate(tool.path)}
                      >
                        Open Tool
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
        </div>
      </main>
      </div>
    </div>
  );
}
