# Task: Make BOTS_OVERWRITTEN Display Real Data

## Context
The `BOTS_OVERWRITTEN` value on the singularity.html dashboard is currently **演出 (theatrical display)**, not real measured data.

### Current Implementation (Found)
- **File:** `singularity.html` (lines ~1299-1306)
- **Formula:** `calculatedBots = 12480 + (views * 1.5) + (clones * 10)`
- **Fallback:** Hardcoded `13,105` if API fails

## Tasks
- [x] Identify source of BOTS_OVERWRITTEN value
- [x] Create implementation plan for real data integration
- [x] Modify code to display real measured data
- [/] Test and verify the change

## Options for Real Data
1. **GitHub API Clones** (real, limited): GitHub's Traffic API can provide unique cloners
2. **Server Access Logs** (real, requires backend): Count actual bot User-Agents
3. **Remove the metric entirely** (honest): If no real data available, remove the演出
4. **Display as "Estimated" with clear label** (transparent): Keep calculation but label it clearly
