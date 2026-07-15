# PowerShell Verification Script for Feature 12A (Persistent Conversation History)
# Make sure your Catalyst server is running locally (e.g. at http://localhost:3000)

function Normalize-Json {
    param($InputObject)
    return $InputObject | ConvertTo-Json -Compress
}

$baseUrl = "http://localhost:3000/server/foren_sight_function"
$sessionA = "session-alice-" + (Get-Date -Format "yyyyMMddHHmmss")
$sessionB = "session-bob-" + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ForenSight Feature 12A Persistent Conversation History Tests" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Conversation
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "1. Starting new conversation for Alice..." -ForegroundColor Yellow
$startBody = @{ sessionId = $sessionA; title = "Alice's Investigation" } | ConvertTo-Json -Compress
Write-Host "Request: POST /conversation/start" -ForegroundColor DarkGray
Write-Host "Body: $startBody" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/start" -Method Post -Body $startBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
    $convoId = $res.data.conversationId
}
catch {
    Write-Host "Failed to start conversation. Ensure your Catalyst tables exist." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Exit
}

# 2. Chat with Auto-Title generation
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "2. Sending first message to Alice's conversation..." -ForegroundColor Yellow
$chatBody = @{ sessionId = $sessionA; conversationId = $convoId; message = "Show criminal Arjun Reddy" } | ConvertTo-Json -Compress
Write-Host "Request: POST /chat" -ForegroundColor DarkGray
Write-Host "Body: $chatBody" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $chatBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
}
catch {
    Write-Host "Chat request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 3. Retrieve Conversations List
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "3. Listing Alice's conversations..." -ForegroundColor Yellow
Write-Host "Request: GET /conversations?sessionId=$sessionA" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversations?sessionId=$sessionA" -Method Get -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
}
catch {
    Write-Host "List request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 4. Get Single Conversation details
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "4. Fetching Alice's conversation details (ROWID: $convoId)..." -ForegroundColor Yellow
Write-Host "Request: GET /conversation/${convoId}?sessionId=${sessionA}" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/${convoId}?sessionId=${sessionA}" -Method Get -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
}
catch {
    Write-Host "Get request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 5. Security Check (Bob accessing Alice's conversation)
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "5. Bob trying to view Alice's conversation (Security Check)..." -ForegroundColor Yellow
Write-Host "Request: GET /conversation/${convoId}?sessionId=${sessionB}" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/${convoId}?sessionId=${sessionB}" -Method Get -TimeoutSec 15
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Red
}
catch {
    Write-Host "Status: Success (Blocked) - Mismatch handled gracefully" -ForegroundColor Green
    Write-Host $_.Exception.Message -ForegroundColor Green
}

# 6. Continue / Restore Memory
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "6. Alice continuing/restoring her conversation memory..." -ForegroundColor Yellow
$conBody = @{ sessionId = $sessionA } | ConvertTo-Json -Compress
Write-Host "Request: POST /conversation/$convoId/continue" -ForegroundColor DarkGray
Write-Host "Body: $conBody" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/$convoId/continue" -Method Post -Body $conBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
}
catch {
    Write-Host "Continue request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 7. Soft Delete
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "7. Alice soft deleting her conversation..." -ForegroundColor Yellow
$delBody = @{ sessionId = $sessionA } | ConvertTo-Json -Compress
Write-Host "Request: DELETE /conversation/$convoId" -ForegroundColor DarkGray
Write-Host "Body: $delBody" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/$convoId" -Method Delete -Body $delBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "Status: Success (200 OK)" -ForegroundColor Green
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Green
}
catch {
    Write-Host "Delete request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# 8. Verify soft-deleted is inaccessible
Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "8. Alice trying to fetch soft-deleted conversation..." -ForegroundColor Yellow
Write-Host "Request: GET /conversation/${convoId}?sessionId=${sessionA}" -ForegroundColor DarkGray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/conversation/${convoId}?sessionId=${sessionA}" -Method Get -TimeoutSec 15
    Write-Host "Response: $(Normalize-Json -InputObject $res)" -ForegroundColor Red
}
catch {
    Write-Host "Status: Success (Blocked) - Deleted conversation returns 404" -ForegroundColor Green
    Write-Host $_.Exception.Message -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "Tests Completed." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
