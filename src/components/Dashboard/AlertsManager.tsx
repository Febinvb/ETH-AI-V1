import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Plus,
  Trash2,
  BellRing,
  MessageSquare,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
} from "lucide-react";

interface Alert {
  id: string;
  name: string;
  type: "PRICE" | "INDICATOR" | "PATTERN" | "SIGNAL";
  condition:
    | "ABOVE"
    | "BELOW"
    | "CROSSES_ABOVE"
    | "CROSSES_BELOW"
    | "APPEARS"
    | "GENERATED";
  value?: number;
  indicator?: string;
  pattern?: string;
  signalType?: "BUY" | "SELL";
  active: boolean;
  notifyVia: ("TELEGRAM" | "EMAIL" | "PUSH")[];
  createdAt: string;
  lastTriggered?: string;
}

const AlertsManager = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      name: "ETH Price Alert",
      type: "PRICE",
      condition: "ABOVE",
      value: 2500,
      active: true,
      notifyVia: ["TELEGRAM", "PUSH"],
      createdAt: "2023-06-10",
      lastTriggered: "2023-06-15",
    },
    {
      id: "2",
      name: "RSI Oversold",
      type: "INDICATOR",
      condition: "BELOW",
      value: 30,
      indicator: "RSI",
      active: true,
      notifyVia: ["TELEGRAM"],
      createdAt: "2023-06-12",
    },
    {
      id: "3",
      name: "Bullish Pattern",
      type: "PATTERN",
      condition: "APPEARS",
      pattern: "Bullish Engulfing",
      active: false,
      notifyVia: ["EMAIL", "PUSH"],
      createdAt: "2023-06-14",
    },
    {
      id: "4",
      name: "Strong Buy Signal",
      type: "SIGNAL",
      condition: "GENERATED",
      signalType: "BUY",
      active: true,
      notifyVia: ["TELEGRAM", "EMAIL", "PUSH"],
      createdAt: "2023-06-15",
    },
  ]);

  const [newAlert, setNewAlert] = useState<Partial<Alert>>({
    type: "PRICE",
    condition: "ABOVE",
    active: true,
    notifyVia: ["TELEGRAM"],
  });

  const handleAddAlert = () => {
    if (newAlert.name) {
      const alert: Alert = {
        id: Date.now().toString(),
        name: newAlert.name,
        type: newAlert.type as "PRICE" | "INDICATOR" | "PATTERN" | "SIGNAL",
        condition: newAlert.condition as any,
        value: newAlert.value,
        indicator: newAlert.indicator,
        pattern: newAlert.pattern,
        signalType: newAlert.signalType as "BUY" | "SELL" | undefined,
        active: newAlert.active || true,
        notifyVia: newAlert.notifyVia || ["TELEGRAM"],
        createdAt: new Date().toISOString().split("T")[0],
      };

      setAlerts([...alerts, alert]);
      setNewAlert({
        type: "PRICE",
        condition: "ABOVE",
        active: true,
        notifyVia: ["TELEGRAM"],
      });
    }
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, active: !alert.active } : alert,
      ),
    );
  };

  const handleNotificationChange = (
    id: string,
    method: "TELEGRAM" | "EMAIL" | "PUSH",
    checked: boolean,
  ) => {
    setAlerts(
      alerts.map((alert) => {
        if (alert.id === id) {
          const notifyVia = checked
            ? [...alert.notifyVia, method]
            : alert.notifyVia.filter((m) => m !== method);
          return { ...alert, notifyVia };
        }
        return alert;
      }),
    );
  };

  const renderConditionInput = () => {
    switch (newAlert.type) {
      case "PRICE":
        return (
          <>
            <div className="space-y-1">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={newAlert.condition}
                onValueChange={(value) =>
                  setNewAlert({ ...newAlert, condition: value as any })
                }
              >
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABOVE">Above</SelectItem>
                  <SelectItem value="BELOW">Below</SelectItem>
                  <SelectItem value="CROSSES_ABOVE">Crosses Above</SelectItem>
                  <SelectItem value="CROSSES_BELOW">Crosses Below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Price Value (USDT)</Label>
              <Input
                id="value"
                type="number"
                value={newAlert.value || ""}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, value: Number(e.target.value) })
                }
                placeholder="e.g. 2500"
              />
            </div>
          </>
        );

      case "INDICATOR":
        return (
          <>
            <div className="space-y-1">
              <Label htmlFor="indicator">Indicator</Label>
              <Select
                value={newAlert.indicator}
                onValueChange={(value) =>
                  setNewAlert({ ...newAlert, indicator: value })
                }
              >
                <SelectTrigger id="indicator">
                  <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSI">RSI</SelectItem>
                  <SelectItem value="MACD">MACD</SelectItem>
                  <SelectItem value="VWAP">VWAP</SelectItem>
                  <SelectItem value="Bollinger Bands">
                    Bollinger Bands
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={newAlert.condition}
                onValueChange={(value) =>
                  setNewAlert({ ...newAlert, condition: value as any })
                }
              >
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABOVE">Above</SelectItem>
                  <SelectItem value="BELOW">Below</SelectItem>
                  <SelectItem value="CROSSES_ABOVE">Crosses Above</SelectItem>
                  <SelectItem value="CROSSES_BELOW">Crosses Below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={newAlert.value || ""}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, value: Number(e.target.value) })
                }
                placeholder="e.g. 30"
              />
            </div>
          </>
        );

      case "PATTERN":
        return (
          <div className="space-y-1">
            <Label htmlFor="pattern">Chart Pattern</Label>
            <Select
              value={newAlert.pattern}
              onValueChange={(value) =>
                setNewAlert({ ...newAlert, pattern: value })
              }
            >
              <SelectTrigger id="pattern">
                <SelectValue placeholder="Select pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bullish Engulfing">
                  Bullish Engulfing
                </SelectItem>
                <SelectItem value="Bearish Engulfing">
                  Bearish Engulfing
                </SelectItem>
                <SelectItem value="Doji">Doji</SelectItem>
                <SelectItem value="Head and Shoulders">
                  Head and Shoulders
                </SelectItem>
                <SelectItem value="Double Top">Double Top</SelectItem>
                <SelectItem value="Double Bottom">Double Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "SIGNAL":
        return (
          <div className="space-y-1">
            <Label htmlFor="signalType">Signal Type</Label>
            <Select
              value={newAlert.signalType}
              onValueChange={(value) =>
                setNewAlert({
                  ...newAlert,
                  signalType: value as "BUY" | "SELL",
                })
              }
            >
              <SelectTrigger id="signalType">
                <SelectValue placeholder="Select signal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY Signal</SelectItem>
                <SelectItem value="SELL">SELL Signal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "PRICE":
        return <ArrowUpCircle className="h-4 w-4" />;
      case "INDICATOR":
        return <ArrowDownCircle className="h-4 w-4" />;
      case "PATTERN":
        return <BellRing className="h-4 w-4" />;
      case "SIGNAL":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertDescription = (alert: Alert) => {
    switch (alert.type) {
      case "PRICE":
        return `Price ${alert.condition.toLowerCase().replace("_", " ")} $${alert.value}`;
      case "INDICATOR":
        return `${alert.indicator} ${alert.condition.toLowerCase().replace("_", " ")} ${alert.value}`;
      case "PATTERN":
        return `${alert.pattern} pattern detected`;
      case "SIGNAL":
        return `${alert.signalType} signal generated`;
      default:
        return "";
    }
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alerts Manager
        </CardTitle>
        <CardDescription>
          Create and manage custom price and indicator alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="active">
              Active Alerts ({alerts.filter((a) => a.active).length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({alerts.filter((a) => !a.active).length})
            </TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {alerts.filter((a) => a.active).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active alerts. Create one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts
                  .filter((alert) => alert.active)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-3 border rounded-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.type)}
                          <span className="font-medium">{alert.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getAlertDescription(alert)}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {alert.notifyVia.includes("TELEGRAM") && (
                            <Badge variant="secondary" className="text-xs">
                              Telegram
                            </Badge>
                          )}
                          {alert.notifyVia.includes("EMAIL") && (
                            <Badge variant="secondary" className="text-xs">
                              Email
                            </Badge>
                          )}
                          {alert.notifyVia.includes("PUSH") && (
                            <Badge variant="secondary" className="text-xs">
                              Push
                            </Badge>
                          )}
                          {alert.lastTriggered && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Last: {alert.lastTriggered}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={() => handleToggleAlert(alert.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            {alerts.filter((a) => !a.active).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inactive alerts.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts
                  .filter((alert) => !alert.active)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-3 border rounded-md bg-muted/30"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.type)}
                          <span className="font-medium">{alert.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getAlertDescription(alert)}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {alert.notifyVia.includes("TELEGRAM") && (
                            <Badge variant="secondary" className="text-xs">
                              Telegram
                            </Badge>
                          )}
                          {alert.notifyVia.includes("EMAIL") && (
                            <Badge variant="secondary" className="text-xs">
                              Email
                            </Badge>
                          )}
                          {alert.notifyVia.includes("PUSH") && (
                            <Badge variant="secondary" className="text-xs">
                              Push
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={() => handleToggleAlert(alert.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="alert-name">Alert Name</Label>
                <Input
                  id="alert-name"
                  value={newAlert.name || ""}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, name: e.target.value })
                  }
                  placeholder="e.g. ETH Price Alert"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="alert-type">Alert Type</Label>
                <Select
                  value={newAlert.type}
                  onValueChange={(value) =>
                    setNewAlert({
                      ...newAlert,
                      type: value as
                        | "PRICE"
                        | "INDICATOR"
                        | "PATTERN"
                        | "SIGNAL",
                      // Reset condition based on type
                      condition:
                        value === "PATTERN"
                          ? "APPEARS"
                          : value === "SIGNAL"
                            ? "GENERATED"
                            : "ABOVE",
                    })
                  }
                >
                  <SelectTrigger id="alert-type">
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRICE">Price Alert</SelectItem>
                    <SelectItem value="INDICATOR">Indicator Alert</SelectItem>
                    <SelectItem value="PATTERN">Pattern Alert</SelectItem>
                    <SelectItem value="SIGNAL">Signal Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderConditionInput()}

              <div className="space-y-2 pt-2">
                <Label>Notification Methods</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="telegram"
                      checked={
                        newAlert.notifyVia?.includes("TELEGRAM") || false
                      }
                      onCheckedChange={(checked) => {
                        const notifyVia = checked
                          ? [...(newAlert.notifyVia || []), "TELEGRAM"]
                          : (newAlert.notifyVia || []).filter(
                              (m) => m !== "TELEGRAM",
                            );
                        setNewAlert({ ...newAlert, notifyVia });
                      }}
                    />
                    <Label htmlFor="telegram">Telegram</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email"
                      checked={newAlert.notifyVia?.includes("EMAIL") || false}
                      onCheckedChange={(checked) => {
                        const notifyVia = checked
                          ? [...(newAlert.notifyVia || []), "EMAIL"]
                          : (newAlert.notifyVia || []).filter(
                              (m) => m !== "EMAIL",
                            );
                        setNewAlert({ ...newAlert, notifyVia });
                      }}
                    />
                    <Label htmlFor="email">Email</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push"
                      checked={newAlert.notifyVia?.includes("PUSH") || false}
                      onCheckedChange={(checked) => {
                        const notifyVia = checked
                          ? [...(newAlert.notifyVia || []), "PUSH"]
                          : (newAlert.notifyVia || []).filter(
                              (m) => m !== "PUSH",
                            );
                        setNewAlert({ ...newAlert, notifyVia });
                      }}
                    />
                    <Label htmlFor="push">Push</Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddAlert}
                disabled={!newAlert.name}
                className="w-full mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlertsManager;
