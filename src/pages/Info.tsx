import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { InfoCard } from "@/components/InfoCard";
import { Input } from "@/components/ui/input";
import { Pill, Clock, Shield, TestTube, Heart, Search } from "lucide-react";

const articles = [
  {
    id: "what-is-prep",
    icon: Pill,
    title: "What is PrEP?",
    description: "Learn about HIV prevention medication",
    content: `PrEP (Pre-Exposure Prophylaxis) is a medication taken by HIV-negative people to reduce the risk of getting HIV.

When taken consistently, PrEP reduces the risk of getting HIV from sex by about 99%.

PrEP is available as a daily pill (Truvada or Descovy) or as a long-acting injection (Cabenuva) given every 2 months.

PrEP does not protect against other STIs or pregnancy. Using condoms alongside PrEP provides additional protection.

Who should consider PrEP?
• People with HIV-positive partners
• People who don't always use condoms
• People who have had an STI in the past 6 months
• People who inject drugs

Talk to a healthcare provider to see if PrEP is right for you.`,
  },
  {
    id: "daily-vs-ondemand",
    icon: Clock,
    title: "Daily vs On-Demand PrEP",
    description: "Choose the right approach for you",
    content: `There are two ways to take PrEP: daily and on-demand (also called 2-1-1 or event-driven).

DAILY PrEP
• Take one pill every day at the same time
• Provides protection after about 7 days of consistent use
• Good for people who have sex regularly
• Easier to remember as part of a daily routine

ON-DEMAND PrEP (2-1-1)
• Take 2 pills 2-24 hours before sex
• Take 1 pill 24 hours after the first dose
• Take 1 pill 48 hours after the first dose
• Good for people who have sex occasionally and can plan ahead

Important: On-demand PrEP has only been studied for anal sex between men. People engaging in vaginal sex should use daily PrEP.

Both methods are highly effective when taken correctly. Choose the one that fits your lifestyle best.`,
  },
  {
    id: "what-is-pep",
    icon: Shield,
    title: "What is PEP?",
    description: "Emergency HIV prevention",
    content: `PEP (Post-Exposure Prophylaxis) is emergency medication taken after potential HIV exposure to prevent infection.

KEY POINTS
• Must be started within 72 hours of exposure
• The sooner you start, the better it works
• Must be taken for 28 days
• Taken as 1-2 pills per day

When might you need PEP?
• Condomless sex with someone who may have HIV
• Condom broke during sex
• Sexual assault
• Sharing needles

Where to get PEP?
• Sexual health clinics
• Emergency rooms
• SWING clinics
• Some pharmacies

PEP is not 100% effective and is not meant to be used regularly. If you need PEP often, consider switching to PrEP for ongoing protection.`,
  },
  {
    id: "hiv-testing",
    icon: TestTube,
    title: "How Often to Test for HIV",
    description: "Regular testing recommendations",
    content: `Regular HIV testing is an important part of staying healthy and protecting yourself and your partners.

TESTING RECOMMENDATIONS

If you're on PrEP:
• Test every 3 months
• This is usually part of your regular PrEP check-ups

If you're sexually active:
• Test at least once a year
• More often if you have multiple partners

After possible exposure:
• Get tested 4-6 weeks after exposure
• Test again at 3 months for confirmation

TYPES OF TESTS

Rapid tests:
• Results in 20 minutes
• Finger prick or oral swab

Lab tests:
• More accurate
• Results in a few days

Self-test kits:
• Can be done at home
• Available at pharmacies

Remember: Early detection means early treatment. There's no shame in testing regularly—it's a sign of taking care of yourself.`,
  },
  {
    id: "condoms-harm-reduction",
    icon: Heart,
    title: "Condoms & Harm Reduction",
    description: "Additional protection strategies",
    content: `Using multiple prevention methods together provides the best protection.

CONDOMS
• Protect against HIV and other STIs
• Also prevent pregnancy
• Use water-based or silicone-based lube
• Never use oil-based products with latex condoms

COMBINING METHODS
• PrEP + condoms = maximum protection
• Reduces risk of all STIs, not just HIV
• No single method is 100% perfect

OTHER HARM REDUCTION TIPS
• Get tested regularly
• Communicate with partners about status
• Reduce number of partners if possible
• Avoid sharing needles
• Consider limiting alcohol/drugs during sex

REMEMBER
• There's no judgment here
• Any protection is better than none
• You deserve to feel safe and healthy
• Small steps lead to big changes

Your health journey is personal. Do what works for you.`,
  },
];

export default function Info() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Learn</h1>
          <p className="text-muted-foreground">Sexual health information</p>
        </div>
        
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 text-lg"
          />
        </div>
        
        {/* Articles */}
        <div className="space-y-3 animate-slide-up">
          {filteredArticles.map((article) => (
            <InfoCard
              key={article.id}
              icon={article.icon}
              title={article.title}
              description={article.description}
              to={`/info/${article.id}`}
            />
          ))}
        </div>
        
        {filteredArticles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No articles found</p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}

export { articles };
