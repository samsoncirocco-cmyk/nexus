---
title: "SLED Procurement Guide"
date: "2026-02-06"
tags: ["sales", "sled", "procurement", "erate", "contracts"]
description: "How SLED organizations buy things — cooperative contracts, RFPs, sole source, budget cycles, and grant funding"
---

# SLED Procurement Guide

How SLED organizations actually buy things. If you don't understand procurement, you don't close deals.

---

## The Reality of SLED Procurement

SLED procurement is not like commercial sales. Key differences:

- **It's public money.** Every dollar is accountable to taxpayers, boards, and auditors.
- **Process is mandatory.** You can't skip steps, even if the customer wants to.
- **Timelines are longer.** A 90-day commercial deal is often a 6-12 month SLED deal.
- **Price isn't always king.** "Best value" matters, but process compliance matters more.
- **Relationships matter, but can't override process.** Your champion can't just sign a PO.
- **Fiscal year drives everything.** Money appears and disappears based on calendar dates.

---

## Procurement Methods

### 1. Cooperative Purchasing Agreements (Your Best Friend)

Cooperative contracts let SLED organizations buy without running their own competitive bid. The cooperative has already done the competitive process, and members can "piggyback" on those contracts.

**Why this matters:** A cooperative contract can reduce a 6-month procurement to a 2-week purchase. Always check if the customer can use one.

#### Major Cooperatives for Fortinet

| Cooperative | Coverage | Notes |
|------------|---------|-------|
| **NASPO ValuePoint** | All 50 states + territories | Formerly WSCA-NASPO. The gold standard for state procurement. Most states recognize it. |
| **OMNIA Partners** | National | Formerly National IPA. Strong in local gov and education. |
| **Sourcewell** | National | Formerly NJPA. Very popular in K-12 and local government. Easy registration. |
| **NCPA** | National | National Cooperative Purchasing Alliance. Growing presence. |
| **HGACBuy** | National (26 states + growing) | Houston-Galveston Area Council. Strong in TX, expanding nationally. |
| **State IT contracts** | State-specific | Many states have their own IT purchasing schedules. Check your states. |

#### How to Use Cooperative Contracts
1. **Confirm eligibility.** "Are you a member of [cooperative]?" or "Can your procurement office use cooperative contracts?"
2. **Get the contract number.** Have it ready. Procurement teams want to see it.
3. **Quote against the contract.** Your VAR/distributor should know the contract pricing and process.
4. **Provide the contract documentation.** Some procurement teams need to see the master agreement, the competitive bid summary, and the authorized dealer list.
5. **Follow the cooperative's ordering process.** Each cooperative has specific requirements (some need registration, some need quotes through their portal).

#### Objections to Cooperative Purchasing
- **"Our procurement requires competitive bids."** → "The cooperative contract already satisfied the competitive bid requirement. Here's the documentation from the competitive process they ran."
- **"We've never used a cooperative before."** → "Many organizations in your state use [cooperative]. I can share examples. Your procurement team can review the master agreement."
- **"We prefer our state contract."** → "Great, let me check if Fortinet is on your state schedule too. If so, we'll use whichever gives you better pricing."

---

### 2. Competitive Bidding (RFP/RFQ/ITB)

When the purchase exceeds a threshold (varies by jurisdiction, typically $25K-$100K), a competitive process is usually required.

#### RFP (Request for Proposal)
- **What it is:** Formal solicitation that evaluates proposals based on multiple criteria (technical, price, experience, support, etc.)
- **When it's used:** Complex purchases where "best value" matters, not just lowest price
- **Typical timeline:** 60-120 days from posting to award
- **Your role:** Help the customer define requirements (if invited), submit a strong response, present/demo if required

**RFP Tips:**
- **Get involved early.** If you hear an RFP is coming, help shape the requirements BEFORE it's posted. Once it's posted, you can't influence it.
- **Pre-position requirements.** ASIC-based performance, Security Fabric integration, single-vendor convergence — these are differentiators you want in the requirements.
- **Answer every question.** Even if it seems irrelevant. Incomplete responses get disqualified.
- **Don't just meet requirements — exceed them.** Show how you go beyond the minimum.
- **Include references.** SLED evaluators love hearing from peers. Include similar agencies/districts.
- **Price matters but isn't everything.** Understand the evaluation criteria and weight. If technical is 60% and price is 40%, invest accordingly.
- **Follow formatting instructions exactly.** Using the wrong font or missing a signature page can get you DQ'd. Really.
- **Leverage your SE.** They should own the technical response. You own the relationship and commercials.
- **Partner coordination.** Your VAR writes the SOW and pricing. Make sure they've done SLED RFPs before.

#### RFQ (Request for Quotation)
- **What it is:** Simpler process focused primarily on price for a defined set of requirements
- **When it's used:** When the customer knows exactly what they want and just needs competitive pricing
- **Typical timeline:** 2-4 weeks
- **Your role:** Ensure the specifications match what you sell, provide competitive pricing through your VAR

#### ITB (Invitation to Bid)
- **What it is:** Lowest-price-wins format. The requirements are fixed, and the lowest compliant bid wins.
- **When it's used:** Commodity purchases. Less common for complex security solutions.
- **Your role:** Make sure you're the lowest compliant bid. If you can't be, assess whether it's worth pursuing.

#### Informal Quotes
- **What it is:** Below the competitive bid threshold, the customer just needs 2-3 quotes
- **Your role:** Be one of the quotes. Make yours easy to understand and compare.
- **Typical threshold:** $10K-$50K depending on jurisdiction

---

### 3. Sole Source Justification

Sole source means buying from one vendor without competitive bidding. It's legal in most jurisdictions but requires justification.

#### When Sole Source Applies
- **Unique capability:** Only one vendor can meet the requirement (this is hard to prove for firewalls)
- **Standardization:** Expanding an existing investment for compatibility reasons (MUCH easier to justify)
- **Emergency:** Urgent security need that can't wait for competitive process (time-limited)
- **Proprietary integration:** Existing system requires specific vendor's products

#### Sole Source Strategies for Fortinet

**Standardization (Your strongest argument):**
"We already have FortiGate at [X] sites. Adding a different vendor would create:
- Two management platforms instead of one
- Two sets of training requirements
- Incompatible security policies across sites
- Loss of Security Fabric integration benefits"

**Unique Integration:**
"The FortiGate Security Fabric provides automated response between firewall, switch, AP, and endpoint that no other vendor can replicate. Breaking the fabric by introducing a different firewall creates security gaps."

**Performance Requirements:**
"Our requirements include [X] Gbps of SSL inspection throughput. Due to Fortinet's custom ASIC architecture, they are the only vendor that can meet this requirement at our price point." (Be careful — this must be demonstrably true.)

#### Sole Source Documentation Template
Most procurement offices need:
1. Description of the product/service needed
2. Why only this vendor can provide it
3. What alternatives were considered and why they're insufficient
4. Cost reasonableness (how you know the price is fair)
5. Duration of the sole source need

**Pro tip:** Help the customer write the sole source justification. Provide the technical language. Make it easy for procurement to approve.

---

### 4. Emergency Procurement

After a breach, ransomware attack, or critical vulnerability, procurement timelines compress dramatically.

#### How Emergency Procurement Works
- Customer declares an emergency or urgent need
- Normal competitive requirements are waived or shortened
- Purchase authority may shift to a single decision-maker
- Typically limited in duration (30-90 days) and may require follow-up competitive process

#### Your Role in Emergency Situations
- **Be responsive.** Answer in hours, not days.
- **Have solutions ready.** Pre-sized quotes for common emergency scenarios (replacement firewall, emergency SD-WAN, interim SASE).
- **Know your partner's inventory.** What can be shipped and deployed THIS WEEK?
- **Be ethical.** Don't gouge on emergency pricing. These customers remember who helped and who exploited.
- **Follow up.** Emergency purchases often lead to broader strategic deals. Plant the seed.

---

## Fiscal Year Cycles — Know Your Timing

Understanding budget cycles is the single most important thing in SLED sales. Money is available at specific times, and if you miss the window, you wait a year.

### State Government

| State FY Pattern | States | Budget Planning | Spend Window |
|-----------------|--------|----------------|--------------|
| **July 1 - June 30** | Most states (46 of 50) | Jan-April for next FY | April-June (use it or lose it) |
| **Oct 1 - Sept 30** | AL, MI, NY, TX | June-Aug for next FY | July-Sept (use it or lose it) |
| **April 1 - March 31** | NY | Dec-Feb for next FY | Jan-March (use it or lose it) |
| **Biennial budgets** | ~20 states | Varies | Funds available across 2 years — more flexibility |

**Key insight:** The 60-90 days before FY end is "use it or lose it" season. Unspent money gets returned. This is your closing window. But you need to have done the work BEFORE this window — customers don't start evaluations in the last 60 days.

### K-12 Education

| Cycle | Timing | Notes |
|-------|--------|-------|
| **Budget development** | Jan-March | Superintendents and tech directors plan next year |
| **Board approval** | March-May | School board votes on budget |
| **E-Rate filing** | Jan-March (Form 470/471) | Must file BEFORE purchasing E-Rate eligible items |
| **Summer deployment** | June-August | IT teams deploy while students are gone |
| **Fiscal year** | Usually July 1 - June 30 | Aligns with school year |

**Key insight:** K-12 buying follows a very predictable cycle. Get proposals in by February-March for summer deployment. E-Rate adds complexity but also a funding source.

**E-Rate Calendar:**
- **July-September:** Start planning, assess needs
- **October-January:** File Form 470 (opens competition)
- **January-March:** Evaluate and file Form 471 (select vendor)
- **April-June:** Get funding commitment letter
- **June-August:** Deploy during summer break
- **September:** Operational for new school year

### Higher Education

| Cycle | Timing | Notes |
|-------|--------|-------|
| **Fiscal year** | Usually July 1 - June 30 | Some align with state FY |
| **Budget planning** | Sept-Jan | Requests flow up through departments |
| **Capital projects** | Variable | Bond-funded projects have their own timeline |
| **Grant-funded** | Variable | Follow the grant timeline, not the fiscal year |

**Key insight:** Higher ed is more flexible than K-12 or state gov. They have more funding sources (tuition, grants, endowments, bonds) and often more procurement flexibility. But they also have more stakeholders and committee-based decisions.

### Local Government (City/County)

| Cycle | Timing | Notes |
|-------|--------|-------|
| **Fiscal year** | Varies — July 1, Oct 1, or Jan 1 | Check each municipality |
| **Budget hearings** | 2-4 months before FY start | Public hearings, council/board approval |
| **Capital improvement** | Multi-year planning | CIP budgets may fund larger projects |
| **Emergency spending** | Anytime | Post-incident or critical vulnerability |

**Key insight:** Local government budgets are the most politically visible. Council members approve budgets in public meetings. Your champion needs to justify the spend to elected officials who may not understand cybersecurity. Help them tell the story.

---

## Budget Strategies — Getting the Money

### When Budget Exists
- **Move fast.** Don't let it sit. Allocated budget gets reallocated.
- **Make purchasing easy.** Cooperative contract, clear quote, ready-to-sign paperwork.
- **Phase if needed.** If the full solution exceeds budget, phase it across fiscal years.
- **Year-end sweep.** In the last 30-60 days of FY, unspent money from other departments sometimes becomes available. Stay close to your champion.

### When Budget Doesn't Exist
- **Help them find it.** Federal grants, state cyber programs, E-Rate, bond funding, insurance premium savings justification.
- **Position for next cycle.** If you can't close this FY, get into next year's budget planning. That means engaging 6-9 months before FY start.
- **Start with a POC.** Low-cost or no-cost entry builds the case for full funding.
- **OpEx vs. CapEx.** Some budgets have flexibility in one but not the other. Ask which is easier.
- **Multi-year agreements.** Spread cost across fiscal years. Year 1 is always the hardest.
- **Cost avoidance story.** "This investment saves $X in [consolidated tools / staff time / incident response costs]."

### Grants and Federal Funding

| Funding Source | Who It's For | What It Covers |
|---------------|-------------|----------------|
| **State & Local Cybersecurity Grant (SLCGP)** | State/local gov | Cybersecurity planning and implementation |
| **E-Rate** | K-12, libraries | Network infrastructure including firewalls (Cat 2) |
| **ESSER / CARES successors** | K-12 | Technology for learning (some cyber eligible) |
| **ARPA** | State/local gov | Broad infrastructure (cyber eligible in some cases) |
| **DHS/CISA grants** | State/local gov | Cybersecurity programs |
| **USDA ReConnect** | Rural areas | Broadband and network infrastructure |
| **State-specific grants** | Varies | Check each state's cyber grant programs |

**Pro tip:** Know the grant calendar for your states. When applications open, proactively reach out to customers. Help them understand what's eligible. If you help them get funded, you're the preferred vendor.

---

## Working with Procurement Teams

### Do's
- **Be responsive.** Return calls/emails the same day. Procurement people deal with dozens of vendors — responsiveness differentiates you.
- **Be accurate.** Wrong part numbers, missing documents, or incorrect pricing creates rework and frustration.
- **Be patient.** Procurement follows a process. Pushing too hard backfires.
- **Know their language.** "Cooperative contract," "sole source justification," "purchase requisition," "encumbrance" — speak their language.
- **Provide documentation proactively.** W-9, insurance certificates, SAM registration, contract vehicles — have these ready before they ask.
- **Respect the process.** Even if it feels slow or bureaucratic, it exists for good reasons.

### Don'ts
- **Don't go around procurement.** Even if your champion says "just send me the quote." Procurement WILL find out, and they will be difficult.
- **Don't surprise them.** No last-minute changes, no hidden costs, no "we forgot to include..."
- **Don't assume they understand the technology.** Procurement teams buy everything from pencils to firewalls. Explain what you're selling in plain language.
- **Don't badmouth their process.** Even if it's terrible. Work within it.

---

## Contract Vehicles Checklist

Before every deal, check:

- [ ] Is the customer on a cooperative contract? (NASPO, OMNIA, Sourcewell, state contract)
- [ ] What's their competitive bid threshold?
- [ ] Do they have existing Fortinet that supports standardization/sole source?
- [ ] What's their fiscal year end?
- [ ] Is there grant funding available?
- [ ] Who needs to approve (procurement, IT committee, board/council)?
- [ ] Is your VAR registered with the cooperative and the customer's purchasing system?
- [ ] Do you need to be in the customer's vendor database? (SAM.gov, state vendor registration)

---

## Common Procurement Pitfalls

### "We lost the deal at procurement"
- **Cause:** Didn't engage procurement early enough. Technical champion loved you, but procurement required competitive process you didn't know about.
- **Fix:** Ask about procurement process in FIRST meeting. Not the last.

### "The RFP was written for the competitor"
- **Cause:** Competitor pre-positioned requirements before the RFP was written.
- **Fix:** Engage earlier. Help shape requirements BEFORE the RFP is posted. If you're responding to an RFP you didn't know about, you're already behind.

### "They used year-end money for something else"
- **Cause:** Your deal wasn't far enough along when money became available.
- **Fix:** Have quotes and paperwork ready to go BEFORE year-end. When money appears, you need to be ready to close in days, not weeks.

### "The board said no"
- **Cause:** Your champion couldn't articulate the value to non-technical decision-makers.
- **Fix:** Help build the board presentation. ROI analysis, peer references, risk context. Make your champion look smart.

### "They chose the lowest bidder"
- **Cause:** The evaluation criteria weighted price too heavily, or you didn't differentiate on value.
- **Fix:** If it's an ITB (lowest price wins), know that going in. If it's an RFP, make sure your technical and value scores are high enough to offset a price gap.

---

*Procurement is not a barrier — it's a process. Learn it, respect it, and use it to your advantage. Your competitors who don't understand procurement will lose to you.*
