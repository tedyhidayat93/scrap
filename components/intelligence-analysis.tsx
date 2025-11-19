"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Shield, Brain, TrendingUp, AlertTriangle, Users, Target, RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface IntelligenceAnalysisProps {
  data: {
    comments: any[]
    isLoading: boolean
    handle: string
    sentimentCounts: { positive: number; neutral: number; negative: number }
  }
}

export function IntelligenceAnalysis({ data }: IntelligenceAnalysisProps) {
  const { comments, isLoading, handle, sentimentCounts } = data
  const [intelligence, setIntelligence] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeIntelligence = async () => {
    if (comments.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, sentimentCounts }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError("Rate limit reached. Please try again in a few moments.")
        } else {
          setError(result.error || "Failed to analyze intelligence")
        }
        return
      }

      setIntelligence(result)
    } catch (err) {
      console.error("[v0] Error analyzing intelligence:", err)
      setError("Failed to generate intelligence analysis.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Intelligence Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">AI-powered threat assessment and insights extraction</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeIntelligence}
            disabled={isAnalyzing || comments.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
            {intelligence ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {isAnalyzing ? "Analyzing intelligence data..." : "Loading comments..."}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !intelligence ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            {handle
              ? "Click 'Analyze' to generate intelligence assessment"
              : "Enter a username or video URL to analyze intelligence"}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Threat Level Assessment */}
            <div className={`p-4 rounded-lg border ${getThreatLevelColor(intelligence.threatLevel?.level)}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base">Threat Level Assessment</h3>
                    <Badge variant="outline" className={getThreatLevelColor(intelligence.threatLevel?.level)}>
                      {intelligence.threatLevel?.level?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{intelligence.threatLevel?.description}</p>
                  {intelligence.threatLevel?.indicators && intelligence.threatLevel.indicators.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-2">Key Indicators:</p>
                      <ul className="text-xs space-y-1">
                        {intelligence.threatLevel.indicators.map((indicator: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{indicator}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Entities */}
            {intelligence.keyEntities && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-card-foreground">Key Entities Detected</h4>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {intelligence.keyEntities.people && intelligence.keyEntities.people.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">People</p>
                      <div className="flex flex-wrap gap-1.5">
                        {intelligence.keyEntities.people.map((person: string) => (
                          <Badge key={person} variant="secondary" className="text-xs">
                            {person}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {intelligence.keyEntities.organizations && intelligence.keyEntities.organizations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Organizations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {intelligence.keyEntities.organizations.map((org: string) => (
                          <Badge key={org} variant="secondary" className="text-xs">
                            {org}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {intelligence.keyEntities.locations && intelligence.keyEntities.locations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Locations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {intelligence.keyEntities.locations.map((location: string) => (
                          <Badge key={location} variant="secondary" className="text-xs">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Behavioral Patterns */}
            {intelligence.behavioralPatterns && intelligence.behavioralPatterns.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-card-foreground">Behavioral Patterns</h4>
                </div>
                <div className="space-y-2">
                  {intelligence.behavioralPatterns.map((pattern: any, idx: number) => (
                    <div key={idx} className="p-3 rounded bg-muted/50">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-card-foreground">{pattern.pattern}</span>
                        <Badge variant="outline" className="text-xs">
                          {pattern.frequency}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{pattern.significance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emerging Trends */}
            {intelligence.emergingTrends && intelligence.emergingTrends.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-card-foreground">Emerging Trends</h4>
                </div>
                <div className="space-y-2">
                  {intelligence.emergingTrends.map((trend: any, idx: number) => (
                    <div key={idx} className="p-3 rounded bg-muted/50">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-card-foreground">{trend.trend}</span>
                        <Badge
                          variant="outline"
                          className={
                            trend.momentum === "rising"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : trend.momentum === "declining"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          }
                        >
                          {trend.momentum}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{trend.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {trend.keywords.map((keyword: string) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Recommendations */}
            {intelligence.recommendations && intelligence.recommendations.length > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-card-foreground">Recommended Actions</h4>
                </div>
                <ul className="space-y-2">
                  {intelligence.recommendations.map((rec: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <div
                        className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          rec.priority === "high"
                            ? "bg-red-500"
                            : rec.priority === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-card-foreground">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
