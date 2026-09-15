# Add-Vote Command Examples

## Overview

The `/poll add-vote` command allows poll administrators and creators to submit votes on behalf of people who cannot vote directly through Discord. This is useful for:

- Recording votes from people who submitted their choices via other channels (email, text, etc.)
- Adding votes for members who are not in the Discord server
- Manually entering historical votes or proxy votes

## Command Syntax

```
/poll add-vote username:<name> rankings:<numbers> [poll_id:<id>] [force:<true|false>]
```

### Parameters

- **`username`** (required): Name of the person voting
  - Used as unique identifier (prefix: `manual_`)
  - Cannot vote twice with same username
  - Example: "John Doe", "Jane Smith"

- **`rankings`** (required): Comma-separated nomination numbers
  - Format depends on poll's tally method
  - Numbers correspond to nomination list order (1-based)
  - Example: "1,3,2" or "2,1,3,4"

- **`poll_id`** (optional): Specific poll ID
  - Defaults to most recent poll if not provided
  - Example: "abc123xyz"

- **`force`** (optional): Allow adding to completed polls
  - Required for completed polls
  - Reopens poll to voting phase
  - Clears existing results for recalculation
  - Example: true

## Voting Format by Tally Method

### Chris-Style Voting

Requires exactly **3 picks** in order of preference:
- 1st place = 3 points
- 2nd place = 2 points  
- 3rd place = 1 point

**Format**: `"first,second,third"`

### Ranked-Choice Voting

Requires **all nominations** to be ranked:
- Must rank every nomination
- Order from most to least preferred
- Uses Instant Runoff Voting (IRV) algorithm

**Format**: `"first,second,third,fourth,..."`

## Examples

### Example 1: Chris-Style Vote (Active Poll)

**Scenario**: Poll has 4 nominations, using chris-style voting

```
/poll add-vote username:"Alice Johnson" rankings:"2,4,1"
```

**Result**:
```
✅ Admin added a vote on behalf of another user.

**Total Votes:** 5
```

**Note**: The response does not reveal the voter's name or their rankings to maintain privacy.

### Example 2: Ranked-Choice Vote (Active Poll)

**Scenario**: Poll has 3 nominations, using ranked-choice voting

```
/poll add-vote username:"Bob Smith" rankings:"3,1,2"
```

**Result**:
```
✅ Admin added a vote on behalf of another user.

**Total Votes:** 8
```

**Note**: The response does not reveal the voter's name or their rankings to maintain privacy.

### Example 3: Adding Vote to Specific Poll

```
/poll add-vote username:"Carol White" rankings:"1,2,3" poll_id:"xyz789"
```

### Example 4: Adding Vote to Completed Poll (Force)

**Scenario**: Poll has already completed and declared a winner

```
/poll add-vote username:"David Brown" rankings:"2,3,1" force:true
```

**Result**:
```
✅ Admin added a vote on behalf of another user and recalculated the results.

**Total Votes:** 12
```

**Notes**: 
- The response does not reveal the voter's name or their rankings to maintain privacy.
- The poll phase changes from "completed" to "voting" and results are cleared. 
- You'll need to run `/poll end-voting` again to see updated results.

## Common Errors and Solutions

### Error: "Chris-style voting requires exactly 3 picks"

**Problem**: Wrong number of nominations provided for chris-style
```
/poll add-vote username:"Eve" rankings:"1,2"  ❌ Only 2 picks
```

**Solution**: Provide exactly 3 picks
```
/poll add-vote username:"Eve" rankings:"1,2,3"  ✅ Correct
```

### Error: "Ranked-choice voting requires ranking all X nominations"

**Problem**: Not all nominations ranked for ranked-choice
```
/poll add-vote username:"Frank" rankings:"1,2"  ❌ Poll has 4 nominations
```

**Solution**: Rank all nominations
```
/poll add-vote username:"Frank" rankings:"1,2,4,3"  ✅ All 4 ranked
```

### Error: "Invalid nomination number: 5"

**Problem**: Nomination number out of range
```
/poll add-vote username:"Grace" rankings:"1,5,2"  ❌ Only 3 nominations exist
```

**Solution**: Use valid nomination numbers (1-3 in this case)
```
/poll add-vote username:"Grace" rankings:"1,3,2"  ✅ Correct
```

### Error: "Cannot vote for the same nomination multiple times"

**Problem**: Duplicate nominations in rankings
```
/poll add-vote username:"Henry" rankings:"1,1,2"  ❌ "1" appears twice
```

**Solution**: Each nomination can only appear once
```
/poll add-vote username:"Henry" rankings:"1,3,2"  ✅ No duplicates
```

### Error: "A vote for 'John Doe' has already been recorded"

**Problem**: Username already voted in this poll
```
/poll add-vote username:"John Doe" rankings:"1,2,3"  ❌ Already voted
```

**Solution**: Use a different username or remove the existing vote first
```
/poll add-vote username:"John Doe (updated)" rankings:"1,2,3"  ✅ Different username
```

### Error: "Cannot add votes to a completed poll"

**Problem**: Poll is completed and force parameter not provided
```
/poll add-vote username:"Ivy" rankings:"1,2,3"  ❌ Poll completed
```

**Solution**: Add `force:true` parameter
```
/poll add-vote username:"Ivy" rankings:"1,2,3" force:true  ✅ With force
```

### Error: "Cannot add votes during the nomination phase"

**Problem**: Poll hasn't started voting yet
```
/poll add-vote username:"Jack" rankings:"1,2,3"  ❌ Still in nomination
```

**Solution**: Wait until voting phase starts or use `/poll end-nominations`

### Error: "Only admins or the poll creator can add votes"

**Problem**: User doesn't have permission
```
/poll add-vote username:"Kate" rankings:"1,2,3"  ❌ Not admin/creator
```

**Solution**: Only administrators or poll creator can use this command

## Workflow Example

### Step 1: Check Poll Status with Index Numbers

```
/poll status nominations:true
```

This displays nominations with prominent index numbers for easy reference.

**Output Example:**
```
📖 Nominations (Index numbers for `/poll add-vote`)
**1.** [Book Title A](link) by Author A (user1)
**2.** [Book Title B](link) by Author B (user2)
**3.** [Book Title C](link) by Author C (user3)
**4.** [Book Title D](link) by Author D (user4)
```

Alternatively, use `/poll status` without the flag for regular formatting:
```
/poll status
```

### Step 2: Collect External Votes

Gather votes from people outside Discord via email, text, or other means.

Example responses:
- "Alice wants to vote for Book 2, then Book 4, then Book 1"
- "Bob's ranking: Book 3, Book 1, Book 2"

### Step 3: Convert to Rankings

Map their preferences to nomination numbers:
- Alice: Books 2,4,1 → `"2,4,1"`
- Bob: Books 3,1,2 → `"3,1,2"`

### Step 4: Submit Votes

```
/poll add-vote username:"Alice" rankings:"2,4,1"
/poll add-vote username:"Bob" rankings:"3,1,2"
```

### Step 5: Verify

Check updated vote count with `/poll status`

## Best Practices

1. **Use Full Names**: Use complete names to avoid confusion
   - ✅ "John Smith" 
   - ❌ "John"

2. **Verify Rankings**: Double-check nomination numbers before submitting
   - Use `/poll status nominations:true` to see index numbers

3. **Document Source**: Keep private records of where votes came from
   - Email threads, text messages, etc.
   - The channel message won't reveal voter identity or rankings

4. **Privacy**: Vote details are only visible to the admin submitting them
   - Channel only sees: "Admin added a vote on behalf of another user"
   - Voter name and rankings remain private

5. **Force Carefully**: Only use `force:true` when necessary
   - Reopens completed polls
   - Requires re-running `/poll end-voting`

6. **Unique Usernames**: Ensure each person has a unique username
   - Add identifiers if needed: "John Smith (email)", "John Smith (text)"
   - These names are stored internally but not displayed publicly

## Technical Details

### Storage

- Manual votes stored with prefix: `manual_username`
- Database field: `user_id = "manual_username"`
- Treated identically to Discord user votes for tallying

### Permissions

Required: One of the following
- Server Administrator permission
- Poll creator (user who ran `/poll create`)

### Phase Behavior

| Poll Phase | Behavior | Force Required |
|------------|----------|----------------|
| Nomination | ❌ Denied | N/A |
| Voting | ✅ Allowed | No |
| Completed | ❌ Denied (without force) | Yes |

When `force:true` is used on completed poll:
1. Phase changes: `completed` → `voting`
2. Results cleared: `results_data` → `null`
3. Vote is added
4. Manual re-calculation needed: Run `/poll end-voting`

## Related Commands

- `/poll status nominations:true` - View nominations with index numbers (recommended for add-vote)
- `/poll status` - View current nominations and vote count (regular format)
- `/poll vote` - Normal voting interface for Discord users
- `/poll end-voting` - Calculate results and complete poll
- `/poll extend` - Extend voting deadline if needed

## Support

If you encounter issues:
1. Verify nomination numbers with `/poll status nominations:true`
2. Check poll phase (nomination/voting/completed)
3. Confirm you have admin or creator permissions
4. Ensure ranking format matches tally method
5. Review error messages for specific guidance