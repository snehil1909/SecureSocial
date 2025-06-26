"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Wrench, RefreshCw, KeyRound, Database, FileText, Trash } from "lucide-react"

export default function RegenerateKeysButton() {
  const [loading, setLoading] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [keyStatus, setKeyStatus] = useState<any>(null)
  const [detailedStatus, setDetailedStatus] = useState<any>(null)
  const [showDetailed, setShowDetailed] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const { toast } = useToast()

  const regenerateKeys = async () => {
    if (loading) return
    
    setLoading(true)
    try {
      // Call the new clear-key-cache endpoint to force an update
      // This ensures the private key is actually changed in the database
      const response = await fetch('/api/users/clear-key-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to regenerate keys")
      }
      
      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Encryption keys regenerated. Reloading the page to apply changes...",
      })
      
      // Force page reload with hard refresh to ensure no caching
      setTimeout(() => {
        // Use the replace method to force a complete reload
        window.location.replace(window.location.pathname + '?t=' + Date.now());
      }, 1500)
    } catch (error) {
      console.error("Failed to regenerate keys:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate keys",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const forceHardRegenerate = async () => {
    if (loading) return;
    
    if (!confirm('WARNING: This will completely reset your encryption keys and may cause loss of access to encrypted messages. Continue?')) {
      return;
    }
    
    setLoading(true);
    try {
      // First clear the browser cache for good measure
      if (window.caches) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
      }
      
      // Use the clear-key-cache endpoint which forces a change
      const response = await fetch('/api/users/clear-key-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate keys");
      }
      
      const result = await response.json();
      
      if (result.keyChanged) {
        toast({
          title: "Success",
          description: "Keys completely reset. Reloading application...",
        });
        
        // Force complete page reload
        setTimeout(() => {
          window.location.href = "/messages?reset=true&t=" + Date.now();
        }, 1500);
      } else {
        throw new Error("Keys were not changed in the database");
      }
      
    } catch (error) {
      console.error("Failed to hard reset keys:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    if (diagnosing) return
    
    setDiagnosing(true)
    try {
      const response = await fetch("/api/debug/key-compatibility")
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to run diagnostic")
      }
      
      const result = await response.json()
      setDiagnosticResult(result)
      
      // Show success/failure toast
      if (result.newKeys.test === "passed") {
        toast({
          title: "Diagnostic Success",
          description: "Your key encryption system is working correctly with new keys.",
        })
      } else {
        toast({
          title: "Diagnostic Failed",
          description: "There are issues with the encryption system.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to run diagnostic:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run diagnostic",
        variant: "destructive",
      })
    } finally {
      setDiagnosing(false)
    }
  }
  
  const checkKeyStatus = async () => {
    setKeyStatus({ loading: true });
    
    try {
      // Add a timestamp to prevent caching
      const response = await fetch(`/api/users/keypair?t=${Date.now()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check key status");
      }
      
      const keyInfo = await response.json();
      setKeyStatus({ ...keyInfo, loading: false });
      
      toast({
        title: "Key Status",
        description: keyInfo.hasKeys 
          ? "You have encryption keys in the database."
          : "No encryption keys found. Please generate keys.",
      });
    } catch (error) {
      console.error("Failed to check key status:", error);
      setKeyStatus({ loading: false, error: error instanceof Error ? error.message : "Unknown error" });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check key status",
        variant: "destructive",
      });
    }
  };
  
  const checkDetailedStatus = async () => {
    setDetailedStatus({ loading: true });
    setShowDetailed(true);
    
    try {
      // Add a timestamp to prevent caching
      const response = await fetch(`/api/debug/key-status?t=${Date.now()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check detailed key status");
      }
      
      const detailedInfo = await response.json();
      setDetailedStatus({ ...detailedInfo, loading: false });
      
      if (detailedInfo.keyDetails?.keyValidation?.success) {
        toast({
          title: "Key Validation",
          description: "Your encryption keys are valid and properly formatted.",
        });
      } else if (detailedInfo.hasKeys) {
        toast({
          title: "Key Validation Failed",
          description: detailedInfo.keyDetails?.keyValidation?.error || "Your keys could not be validated.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to check detailed key status:", error);
      setDetailedStatus({ loading: false, error: error instanceof Error ? error.message : "Unknown error" });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check detailed status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800">Having trouble with encryption?</h3>
          <p className="text-amber-700 text-sm mt-1 mb-3">
            If you're experiencing issues with encrypted messages, try regenerating your encryption keys.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={regenerateKeys}
              disabled={loading}
              variant="outline"
              className="border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {loading ? "Regenerating..." : "Regenerate Encryption Keys"}
            </Button>
            
            <Button 
              onClick={runDiagnostic}
              disabled={diagnosing}
              variant="outline"
              className="border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800"
            >
              <Wrench className="h-4 w-4 mr-1" />
              {diagnosing ? "Running..." : "Run Diagnostic"}
            </Button>
            
            <Button
              onClick={checkKeyStatus}
              disabled={keyStatus?.loading}
              variant="outline"
              className="border-green-300 bg-green-100 hover:bg-green-200 text-green-800"
            >
              <KeyRound className="h-4 w-4 mr-1" />
              {keyStatus?.loading ? "Checking..." : "Check Key Status"}
            </Button>
            
            <Button
              onClick={checkDetailedStatus}
              disabled={detailedStatus?.loading}
              variant="outline"
              className="border-purple-300 bg-purple-100 hover:bg-purple-200 text-purple-800"
            >
              <FileText className="h-4 w-4 mr-1" />
              {detailedStatus?.loading ? "Checking..." : "Detailed Diagnostics"}
            </Button>
            
            <Button
              onClick={forceHardRegenerate}
              disabled={loading}
              variant="outline"
              className="border-red-300 bg-red-100 hover:bg-red-200 text-red-800"
            >
              <Trash className="h-4 w-4 mr-1" />
              Emergency Reset
            </Button>
          </div>
          
          {keyStatus && !keyStatus.loading && !keyStatus.error && (
            <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-sm">
              <h4 className="font-semibold mb-1">Key Status:</h4>
              <p>{keyStatus.hasKeys ? '✅ Keys found in database' : '❌ No keys found'}</p>
              {keyStatus.timestamp && <p>Last updated: {new Date(keyStatus.timestamp).toLocaleString()}</p>}
            </div>
          )}
          
          {showDetailed && detailedStatus && !detailedStatus.loading && (
            <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Detailed Key Diagnostics:</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowDetailed(false)}
                >
                  Hide
                </Button>
              </div>
              
              {detailedStatus.error ? (
                <p className="text-red-500">{detailedStatus.error}</p>
              ) : (
                <>
                  <div className="mb-2 mt-2">
                    <p><strong>Public Key:</strong> {detailedStatus.hasKeys ? '✅ Present' : '❌ Missing'}</p>
                    {detailedStatus.keyDetails?.publicKeyLength > 0 && (
                      <>
                        <p>Length: {detailedStatus.keyDetails.publicKeyLength} chars</p>
                        <p>Fingerprint: {detailedStatus.keyDetails.publicKeyFingerprint}</p>
                        <p className="text-xs text-gray-500 mt-1 break-all">
                          {detailedStatus.keyDetails.publicKeyPrefix}
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <p><strong>Private Key:</strong> {detailedStatus.keyDetails?.privateKeyEncrypted ? '✅ Present (encrypted)' : '❌ Missing'}</p>
                    {detailedStatus.keyDetails?.privateKeyLength > 0 && (
                      <p>Length: {detailedStatus.keyDetails.privateKeyLength} chars (encrypted)</p>
                    )}
                    <p><strong>Key Validation:</strong> {detailedStatus.keyDetails?.keyValidation?.success ? 
                      '✅ Valid' : 
                      `❌ Invalid (${detailedStatus.keyDetails?.keyValidation?.error || 'Unknown error'})`
                    }</p>
                  </div>
                  
                  {detailedStatus.sessionKeys && detailedStatus.sessionKeys.length > 0 && (
                    <div className="mb-2">
                      <p><strong>Session Keys:</strong></p>
                      <ul className="pl-4 list-disc">
                        {detailedStatus.sessionKeys.map((sk: any, i: number) => (
                          <li key={i}>
                            Conversation {sk.conversationId.substring(0, 8)}...: 
                            {sk.hasSessionKey ? '✅ Present' : '❌ Missing'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {detailedStatus.keyHistory && detailedStatus.keyHistory.length > 0 && (
                    <div>
                      <p><strong>Key Changes:</strong></p>
                      <ul className="pl-4 list-disc">
                        {detailedStatus.keyHistory.map((h: any, i: number) => (
                          <li key={i}>
                            {new Date(h.date).toLocaleString()}: {h.event}
                            {h.keyFingerprint && ` (${h.keyFingerprint})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {diagnosticResult && (
            <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-sm">
              <h4 className="font-semibold mb-1">Diagnostic Results:</h4>
              
              <div className="mb-2">
                <p><strong>Existing Keys:</strong> {diagnosticResult.existingKeys.hasKeys ? 'Found' : 'None'}</p>
                {diagnosticResult.existingKeys.hasKeys && (
                  <p>Test: {diagnosticResult.existingKeys.test === "passed" ? 
                    '✅ Passed' : 
                    diagnosticResult.existingKeys.test === "error" ? 
                    `❌ Error: ${diagnosticResult.existingKeys.error}` : 
                    '❌ Failed'}
                  </p>
                )}
              </div>
              
              <div>
                <p><strong>New Test Keys:</strong></p>
                <p>Encryption Test: {diagnosticResult.newKeys.test === "passed" ? 
                  '✅ Passed' : 
                  diagnosticResult.newKeys.test === "error" ? 
                  `❌ Error: ${diagnosticResult.newKeys.error}` : 
                  '❌ Failed'}
                </p>
                {diagnosticResult.newKeys.signatureTest && (
                  <p>Signature Test: {diagnosticResult.newKeys.signatureTest === "passed" ? '✅ Passed' : '❌ Failed'}</p>
                )}
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                If tests fail with existing keys but pass with new keys, try regenerating your keys.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}