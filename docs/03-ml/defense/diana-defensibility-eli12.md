# DIANA Defensibility: ELI12 (Explain Like I'm 12)

**Companion to:** [DIANA Defensibility Memo](./diana-defensibility-memo.md)  
**Purpose:** Plain-language summary of our ML defense strategy for non-technical stakeholders

---

## What is DIANA?

DIANA is a computer program that helps doctors spot women going through menopause who might be at risk for diabetes. It doesn't diagnose—it just flags people who should get checked out by a real doctor.

## The Big Idea: "Clinician-in-the-Loop"

Think of DIANA like a smoke detector. A smoke detector beeps when it smells smoke, but you still call the fire department to check if there's really a fire. DIANA "beeps" when someone's health numbers look concerning, but a doctor always makes the final call.

---

## Our Three Main Defenses

### 1. We Group People by Their Body Chemistry (Clustering)

**The Problem:** Not everyone's body works the same way. Some people get diabetes because they can't process insulin well. Others have different issues.

**Our Solution:** We use math to group people into 4 "types" based on their body measurements. This is like sorting books by genre—diabetes books go here, heart health books go there.

**The Catch:** The math actually works best with 2-3 groups, but doctors expect 4 types based on famous research (Ahlqvist 2018). We chose 4 groups to match what doctors already know, even though 2-3 might be mathematically "cleaner."

**How We Defend It:**
- We're honest that 2-3 groups fit the data better
- We explain why 4 groups are more useful for doctors
- We use proven formulas (LAP score) to identify the "insulin-resistant" type

### 2. We Tested Our System Fairly (Nested Cross-Validation)

**The Problem:** It's easy to cheat when testing AI. If you practice with the same test questions you'll see on exam day, you'll get a good score—but you didn't really learn.

**Our Solution:** We use a special testing method called "nested cross-validation." It's like:
1. Study with Book A, test on Book B
2. Study with Book B, test on Book A
3. Average both scores

This proves our system works on NEW people, not just the ones it practiced on.

**The Numbers:** Our system correctly identifies diabetes risk about 84% of the time on people it's never seen before.

### 3. We Explain Our Reasoning (SHAP)

**The Problem:** Most AI is a "black box"—it gives an answer but can't explain why.

**Our Solution:** We use SHAP (a math technique) to show which health numbers mattered most for each prediction. For example:
- "Your BMI of 32 added 15% to your risk"
- "Your good cholesterol subtracted 8% from your risk"

**The Catch:** The computer does math on "standardized" numbers (like converting inches to centimeters), but we show doctors the real numbers (pounds, mg/dL) they understand. Both are correct—we just translate for different audiences.

---

## What Could Go Wrong? (And How We Prevented It)

| The Risk | What It Means | How We Fixed It |
|----------|---------------|-----------------|
| **Training-Serving Skew** | The practice test was different from the real test | We save the exact same "study guide" and use it every time |
| **Cluster Instability** | The groupings might be random noise | We measure how well-separated the groups are (silhouette score) |
| **Misinterpretation** | Doctors might think SHAP shows raw numbers | Our UI clearly labels everything and includes explanations |

---

## What We Can't Do (Honest Limitations)

1. **We can't prove our clusters are super stable.** We didn't run 100+ tests to show the groupings stay the same every time. This is on our "to-improve" list.

2. **We use proxy measurements.** We estimate insulin resistance using waist size + triglycerides instead of the gold-standard lab test. It's accurate enough for screening, but not perfect.

3. **We only look at one moment in time.** Real health changes over months and years. Future versions should track people longitudinally.

---

## The Bottom Line

**Is DIANA perfect?** No. But it's:
- ✅ **Clinically grounded** (based on real medical research)
- ✅ **Honestly tested** (no cheating on the exam)
- ✅ **Transparent** (can explain every prediction)
- ✅ **Safe** (always keeps a human doctor in charge)

**Would a thesis panel approve?** Yes—because we've documented everything, acknowledged limitations, and never claim it's more than a screening tool.

---

## Quick Q&A for Curious People

**Q: Why 4 groups if 3 works better?**  
A: Doctors expect 4 types based on 20+ years of diabetes research. We'd confuse them with 3. Being useful matters more than being mathematically perfect.

**Q: How do you know the AI isn't biased?**  
A: We test on data from many different people. We also don't hide our methods—anyone can check our work.

**Q: What if the AI makes a mistake?**  
A: That's why we call it "screening, not diagnosis." Every result gets checked by a doctor. The AI is just a first filter.

**Q: Can I see how it works?**  
A: Yes! Every prediction comes with a "feature importance" chart showing which health numbers mattered most. Nothing is hidden.

---

*For technical details, see the full [Defensibility Memo](./diana-defensibility-memo.md). For what we're fixing next, see the [Remediation Workplan](./diana-remediation-workplan.md).*
