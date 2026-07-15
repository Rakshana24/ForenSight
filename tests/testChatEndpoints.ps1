# PowerShell Verification Script for Feature 10A & 10B (Conversational Crime Intelligence with Memory)
# Make sure your Catalyst server is running locally (e.g. at http://localhost:3000)

function Normalize-Json {
    param($InputObject)
    return $InputObject | ConvertTo-Json -Compress
}

$baseUrl = "http://localhost:3000/server/foren_sight_function/chat"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ForenSight Conversational Crime Intelligence Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Generating a unique sessionId for conversational tests
$convoSessionId = "convo-session-" + (Get-Date -Format "yyyyMMddHHmmss")
$emptySessionId = "empty-session-" + (Get-Date -Format "yyyyMMddHHmmss")

$testCases = @(
    @{
        Name = "1a. [FIR Search] Show FIR 100160057202100001"
        Body = @{ message = "Show FIR 100160057202100001"; sessionId = $convoSessionId }
    },
    @{
        Name = "1b. [Follow-up] Who investigated it? (Resolves to previous FIR)"
        Body = @{ message = "Who investigated it?"; sessionId = $convoSessionId }
    },
    @{
        Name = "2a. [Criminal Search] Show criminal Arjun Reddy"
        Body = @{ message = "Show criminal Arjun Reddy"; sessionId = $convoSessionId }
    },
    @{
        Name = "2b. [Follow-up] How many cases does he have? (Resolves to criminal)"
        Body = @{ message = "How many cases does he have?"; sessionId = $convoSessionId }
    },
    @{
        Name = "3a. [Victim Search] Show victim Rajesh Bhat"
        Body = @{ message = "Show victim Rajesh Bhat"; sessionId = $convoSessionId }
    },
    @{
        Name = "3b. [Follow-up Regression 1] Which police station handled the case? (Resolves to victim case)"
        Body = @{ message = "Which police station handled the case?"; sessionId = $convoSessionId }
    },
    @{
        Name = "3c. [Follow-up Regression 2] Which court handled the case? (Resolves to victim case)"
        Body = @{ message = "Which court handled the case?"; sessionId = $convoSessionId }
    },
    @{
        Name = "3d. [Follow-up Regression 3] What was the FIR? (Resolves to victim case)"
        Body = @{ message = "What was the FIR?"; sessionId = $convoSessionId }
    },
    @{
        Name = "3e. [Follow-up Regression 4] Who was the investigating officer? (Resolves to victim case)"
        Body = @{ message = "Who was the investigating officer?"; sessionId = $convoSessionId }
    },
    @{
        Name = "4. [Clarify Check] Pronoun reference on empty session (Should clarify)"
        Body = @{ message = "Who investigated it?"; sessionId = $emptySessionId }
    },
    @{
        Name = "5a. [Reset Action] Clear conversation memory"
        Body = @{ message = "reset"; sessionId = $convoSessionId }
    },
    @{
        Name = "5b. [Reset Check] Pronoun reference after reset (Should clarify)"
        Body = @{ message = "Who investigated it?"; sessionId = $convoSessionId }
    }
)

foreach ($tc in $testCases) {
    Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "Running: $($tc.Name)" -ForegroundColor Yellow
    Write-Host "Request Body: $(Normalize-Json -InputObject $tc.Body)" -ForegroundColor DarkGray
    Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
    
    try {
        $jsonBody = $tc.Body | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $jsonBody -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "Status: Success (200 OK)" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White
    }
    catch {
        Write-Host "Status: Failed" -ForegroundColor Red
        Write-Host "Error details:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "Tests Completed." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
