import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaUser,
  FaTag,
  FaClock,
  FaShareAlt,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaLink,
  FaCheckCircle,
  FaShieldAlt,
  FaLock,
  FaSearch,
  FaStar,
  FaComments,
} from "react-icons/fa";
import styles from "./BlogPage.module.css";
import SEO from "../../components/seo/SEO";

// ── Blog Post Data ──
const BLOG_POSTS = [
  {
    id: "how-to-hire-verified-electrician-lagos",
    slug: "how-to-hire-verified-electrician-lagos",
    title: "How to hire a verified electrician in Lagos",
    excerpt:
      "Finding a reliable electrician in Lagos can be challenging. This comprehensive guide walks you through every step of hiring a verified electrician, from searching to verifying credentials and ensuring quality work.",
    content: `
      <p>Finding a reliable electrician in Lagos can be a daunting task. With thousands of electricians claiming to be professionals, how do you separate the skilled from the unqualified? This guide will walk you through everything you need to know to hire a verified electrician in Lagos.</p>

      <h2>Why You Need a Verified Electrician</h2>
      <p>Electrical work is dangerous. Faulty wiring causes over 30% of house fires in Nigeria. Hiring an unqualified electrician puts your property and family at risk. A verified electrician has:</p>
      <ul>
        <li><strong>Proper certification</strong> from recognized bodies like NERC or COREN</li>
        <li><strong>Proven experience</strong> with verifiable past projects</li>
        <li><strong>Insurance coverage</strong> for liability and accidents</li>
        <li><strong>Professional tools</strong> and equipment for safe work</li>
      </ul>

      <h2>Step 1: Search for Electricians in Your Area</h2>
      <p>Start by searching for electricians in your specific Lagos neighborhood. Use platforms like SkilledProz that verify workers before they appear in search results. Search for keywords like:</p>
      <ul>
        <li>"Electrician in Surulere"</li>
        <li>"Certified electrician Lekki"</li>
        <li>"Emergency electrician Ikeja"</li>
      </ul>
      <p>Filter by distance to find workers near you. This saves time and ensures quick response in emergencies.</p>

      <h2>Step 2: Check Their Profile and Portfolio</h2>
      <p>Once you find potential electricians, check their profile thoroughly. Look for:</p>
      <ul>
        <li><strong>Profile completion</strong> – 100% complete profiles indicate professionals</li>
        <li><strong>Portfolio photos</strong> – Past projects show their work quality</li>
        <li><strong>Certifications</strong> – NERC registration, COREN membership, or other recognized certifications</li>
        <li><strong>Rating and reviews</strong> – Minimum 4.0 stars with at least 5 reviews</li>
      </ul>

      <h2>Step 3: Verify Their Credentials</h2>
      <p>Don't just trust the platform's verification. Take these extra steps:</p>
      <ul>
        <li><strong>Ask for NERC registration number</strong> – Verify on the NERC website</li>
        <li><strong>Request past project references</strong> – Call previous clients</li>
        <li><strong>Check for insurance</strong> – Ensure they have valid insurance</li>
        <li><strong>Verify tools and equipment</strong> – Do they have proper tools for the job?</li>
      </ul>

      <h2>Step 4: Get Multiple Quotes</h2>
      <p>Contact at least 3 electricians and request quotes. Provide detailed job descriptions including:</p>
      <ul>
        <li>Type of work needed (installation, repair, rewiring)</li>
        <li>Location and accessibility</li>
        <li>Materials required (who provides them?)</li>
        <li>Timeline expectations</li>
      </ul>
      <p>Compare quotes but remember: the cheapest option isn't always the best. Look for value and reliability.</p>

      <h2>Step 5: Use Escrow Payment Protection</h2>
      <p>Never pay 100% upfront. Use escrow payment platforms like SkilledProz where:</p>
      <ul>
        <li><strong>Funds are held securely</strong> – Money is locked until job completion</li>
        <li><strong>Work quality is guaranteed</strong> – Payment only released when you're satisfied</li>
        <li><strong>Disputes are resolved</strong> – Neutral team reviews any disagreements</li>
      </ul>

      <h2>Step 6: Communicate Clearly Before Hiring</h2>
      <p>Use the platform's messaging or video call features to discuss:</p>
      <ul>
        <li>Scope of work (be as detailed as possible)</li>
        <li>Timeline and milestones</li>
        <li>Payment structure (deposit, progress payments, final payment)</li>
        <li>Warranty and after-service support</li>
      </ul>

      <h2>Step 7: Track the Work Progress</h2>
      <p>Once hired, use the platform's features to track progress:</p>
      <ul>
        <li><strong>GPS check-in</strong> – Confirm the worker arrived at your location</li>
        <li><strong>Regular updates</strong> – Ask for progress photos and updates</li>
        <li><strong>Quality checks</strong> – Inspect work at key milestones</li>
      </ul>

      <h2>Step 8: Inspect and Release Payment</h2>
      <p>Before releasing payment:</p>
      <ul>
        <li><strong>Inspect the work</strong> – Test all electrical connections and switches</li>
        <li><strong>Check for safety</strong> – Ensure all work meets safety standards</li>
        <li><strong>Request warranty</strong> – Get written warranty for the work done</li>
      </ul>
      <p>Only release payment from escrow when you're 100% satisfied. Once confirmed, the electrician gets paid automatically.</p>

      <h2>Red Flags to Avoid</h2>
      <ul>
        <li>❌ Electrician who demands 100% upfront payment outside the platform</li>
        <li>❌ No portfolio or past project photos</li>
        <li>❌ Refuses to provide references</li>
        <li>❌ No certification or registration</li>
        <li>❌ Unprofessional communication</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Hiring a verified electrician in Lagos doesn't have to be stressful. By following these steps and using a trusted platform like SkilledProz, you can find, verify, and hire qualified professionals safely and securely. Start your search today and enjoy peace of mind with every electrical project.</p>
    `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-31",
    readTime: "8 min read",
    image: "/blog/electrician-lagos.jpg",
    category: "Hiring Guide",
    tags: ["electrician", "Lagos", "hiring guide", "verification", "safety"],
    likes: 124,
    comments: 18,
  },
  {
    id: "why-escrow-safer-gig-work",
    slug: "why-escrow-safer-gig-work",
    title: "Why escrow is safer for gig work",
    excerpt:
      "Escrow payments are revolutionizing the gig economy. Learn why holding funds securely until job completion protects both workers and hirers, and why it's the future of trustworthy transactions.",
    content: `
      <p>The gig economy in Nigeria is growing rapidly. Millions of Nigerians now earn a living through freelance and gig work. But with this growth comes a major problem: trust. How do you pay for services without risking getting scammed? The answer is escrow.</p>

      <h2>What is Escrow?</h2>
      <p>Escrow is a financial arrangement where a neutral third party holds funds until both parties fulfill their obligations. In the context of gig work:</p>
      <ul>
        <li><strong>Hirer deposits payment</strong> into the escrow account</li>
        <li><strong>Funds are locked</strong> and visible to both parties</li>
        <li><strong>Worker completes the job</strong> to the hirer's satisfaction</li>
        <li><strong>Payment is released</strong> automatically after confirmation</li>
      </ul>

      <h2>The Problem with Traditional Payments</h2>
      <p>Traditional payment methods have serious flaws for gig work:</p>
      <ul>
        <li><strong>Upfront payments</strong> – Hirers risk losing money if the worker disappears</li>
        <li><strong>After-service payments</strong> – Workers risk not getting paid after completing the job</li>
        <li><strong>Cash payments</strong> – No paper trail or dispute resolution</li>
        <li><strong>Bank transfers</strong> – No protection if the job isn't done</li>
      </ul>
      <p>In 2025 alone, Nigerians lost over ₦50 billion to gig-related fraud. Escrow solves all these problems.</p>

      <h2>Benefits of Escrow for Hirers</h2>
      <ul>
        <li><strong>💰 Money is safe</strong> – Your payment is only released when you confirm the job is complete</li>
        <li><strong>🔍 Quality assurance</strong> – Workers complete the job to your satisfaction before getting paid</li>
        <li><strong>⚖️ Dispute protection</strong> – If something goes wrong, your money is protected</li>
        <li><strong>📊 Transparency</strong> – You can see exactly where your money is at all times</li>
      </ul>

      <h2>Benefits of Escrow for Workers</h2>
      <ul>
        <li><strong>✅ Payment certainty</strong> – You know the money is there and waiting for you</li>
        <li><strong>🛡️ Protection from non-payment</strong> – No more chasing clients for payment</li>
        <li><strong>🏆 Professional reputation</strong> – Using escrow shows you're serious and trustworthy</li>
        <li><strong>🚀 Faster payment</strong> – Money is released immediately after job confirmation</li>
      </ul>

      <h2>How Escrow Works on SkilledProz</h2>
      <ol>
        <li><strong>Hirer posts a job</strong> – Describes the work and sets the budget</li>
        <li><strong>Worker accepts</strong> – Agrees to the terms and price</li>
        <li><strong>Hirer funds escrow</strong> – Deposits the full payment</li>
        <li><strong>Worker completes work</strong> – Performs the job to the agreed standards</li>
        <li><strong>Hirer confirms</strong> – Verifies the work is complete and satisfactory</li>
        <li><strong>Payment releases</strong> – Worker receives the money automatically</li>
      </ol>

      <h2>Escrow vs. Other Payment Methods</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Escrow</th>
            <th>Upfront Payment</th>
            <th>After Payment</th>
            <th>Cash</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hirer protection</td>
            <td>✅</td>
            <td>❌</td>
            <td>✅</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Worker protection</td>
            <td>✅</td>
            <td>✅</td>
            <td>❌</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Dispute resolution</td>
            <td>✅</td>
            <td>❌</td>
            <td>❌</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>No fraud risk</td>
            <td>✅</td>
            <td>❌</td>
            <td>❌</td>
            <td>❌</td>
          </tr>
        </tbody>
      </table>

      <h2>Common Myths About Escrow</h2>
      <ul>
        <li><strong>❌ "Escrow is too slow"</strong> – Payments release instantly on SkilledProz after confirmation</li>
        <li><strong>❌ "It's too expensive"</strong> – The small fee is worth the peace of mind</li>
        <li><strong>❌ "It's complicated"</strong> – SkilledProz makes it simple with one-click funding and release</li>
        <li><strong>❌ "Only for big jobs"</strong> – Escrow works for jobs of any size</li>
      </ul>

      <h2>Why Escrow is the Future of Gig Work</h2>
      <p>The gig economy is here to stay. As more Nigerians turn to freelance and contract work, trust becomes more important than ever. Escrow provides the foundation for this trust by:</p>
      <ul>
        <li><strong>Building accountability</strong> – Both parties are motivated to complete the job</li>
        <li><strong>Reducing disputes</strong> – Clear terms and protected payments prevent conflicts</li>
        <li><strong>Enabling growth</strong> – When people trust the platform, they use it more</li>
        <li><strong>Professionalizing gig work</strong> – Escrow brings professionalism to the informal economy</li>
      </ul>

      <h2>Start Using Escrow Today</h2>
      <p>Whether you're hiring or working, escrow provides the security you need. Join SkilledProz and experience hassle-free, protected transactions. Your money is safe, your work is valued, and your reputation grows.</p>
    `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-30",
    readTime: "7 min read",
    image: "/blog/escrow-safer.jpg",
    category: "Safety & Security",
    tags: ["escrow", "payment security", "gig economy", "freelance", "trust"],
    likes: 98,
    comments: 24,
  },
  {
    id: "10-things-to-check-before-hiring-worker-online",
    slug: "10-things-to-check-before-hiring-worker-online",
    title: "10 things to check before hiring a worker online",
    excerpt:
      "Hiring online workers is convenient but risky. This guide covers 10 essential checks you must make before hiring any worker online to ensure quality, reliability, and safety.",
    content: `
      <p>Hiring workers online has never been easier. But with convenience comes risk. How do you know the worker you're hiring is legitimate, skilled, and trustworthy? This guide covers 10 essential checks you must make before hiring any worker online.</p>

      <h2>1. Verify Their Phone Number</h2>
      <p><strong>Why it matters:</strong> A verified phone number is the foundation of trust. It proves the worker is reachable and committed.</p>
      <p><strong>What to check:</strong> Look for platforms that verify phone numbers. On SkilledProz, all workers must verify their phone number before they can accept jobs.</p>
      <p><strong>Red flag:</strong> Worker who refuses to share their phone number or only uses messaging apps.</p>

      <h2>2. Read Their Reviews</h2>
      <p><strong>Why it matters:</strong> Past reviews give you insight into the worker's reliability and quality of work.</p>
      <p><strong>What to check:</strong> Look for at least 3-5 reviews with an average rating of 4.0 or higher. Read both positive and negative reviews to get a balanced view.</p>
      <p><strong>Red flag:</strong> All reviews are from the same date or sound like they were written by the same person.</p>

      <h2>3. Examine Their Portfolio</h2>
      <p><strong>Why it matters:</strong> A portfolio shows what the worker can actually do.</p>
      <p><strong>What to check:</strong> Look for consistent quality, variety of projects, and clear photos. On SkilledProz, workers can upload project photos and videos.</p>
      <p><strong>Red flag:</strong> Blurry images, stock photos, or inconsistent project styles.</p>

      <h2>4. Check for Certifications and Training</h2>
      <p><strong>Why it matters:</strong> Certifications prove that a worker has formal training and knows industry standards.</p>
      <p><strong>What to check:</strong> Look for recognized certifications in their field. For electricians, check for NERC registration. For plumbers, look for plumbing certifications.</p>
      <p><strong>Red flag:</strong> Claims of certification but no proof or documentation.</p>

      <h2>5. Confirm Their Location and Availability</h2>
      <p><strong>Why it matters:</strong> You need someone who can actually show up to your location and complete the job on time.</p>
      <p><strong>What to check:</strong> Verify the worker is within a reasonable distance. Check their availability calendar on the platform.</p>
      <p><strong>Red flag:</strong> Worker is far from your location or has limited availability.</p>

      <h2>6. Understand Their Pricing Structure</h2>
      <p><strong>Why it matters:</strong> Clear pricing prevents billing disputes and surprises.</p>
      <p><strong>What to check:</strong> Ask for a detailed quote including materials, labor, and any additional costs. Check if transport is included.</p>
      <p><strong>Red flag:</strong> Vague pricing or unwillingness to provide a written quote.</p>

      <h2>7. Ask About Their Tools and Equipment</h2>
      <p><strong>Why it matters:</strong> Workers with proper tools complete jobs faster and with higher quality.</p>
      <p><strong>What to check:</strong> Ask about the tools they have. For trades like electrical or plumbing, specialized tools are essential.</p>
      <p><strong>Red flag:</strong> Worker who doesn't own basic tools or asks you to provide them.</p>

      <h2>8. Get Clear Timeline and Milestones</h2>
      <p><strong>Why it matters:</strong> Clear timelines prevent delays and misunderstandings.</p>
      <p><strong>What to check:</strong> Agree on a start date, end date, and key milestones. Get it in writing on the platform.</p>
      <p><strong>Red flag:</strong> Worker who can't give a clear timeline or is vague about completion.</p>

      <h2>9. Discuss Waste Management</h2>
      <p><strong>Why it matters:</strong> For construction and renovation jobs, waste management is a major consideration.</p>
      <p><strong>What to check:</strong> Ask how they'll handle waste. Will they take it away or do you need to arrange disposal?</p>
      <p><strong>Red flag:</strong> Worker who doesn't have a plan for waste disposal.</p>

      <h2>10. Use Platform Payment - Never Go Off-Platform</h2>
      <p><strong>Why it matters:</strong> The platform's escrow protects you. Going off-platform removes all protection.</p>
      <p><strong>What to check:</strong> Always use the platform's payment system. This ensures you can dispute issues and get refunds.</p>
      <p><strong>Red flag:</strong> Worker who asks for payment outside the platform.</p>

      <h2>Bonus: Trust Your Gut</h2>
      <p>If something feels off during the hiring process, it probably is. Trust your instincts and don't rush the hiring decision. A good worker will be patient, professional, and willing to answer all your questions.</p>

      <h2>Conclusion</h2>
      <p>Hiring online doesn't have to be a gamble. By following these 10 checks, you can find reliable, skilled workers who deliver quality work. Platforms like SkilledProz make this process easier by pre-verifying workers and providing escrow protection. Start your search today and hire with confidence.</p>
    `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-29",
    readTime: "10 min read",
    image: "/blog/hiring-worker-online.jpg",
    category: "Tips & Advice",
    tags: [
      "hiring tips",
      "worker verification",
      "safety",
      "online hiring",
      "freelance",
    ],
    likes: 156,
    comments: 32,
  },
  {
    id: "skilledproz-platform-features-complete-guide",
    slug: "skilledproz-platform-features-complete-guide",
    title:
      "SkilledProz Platform Features: Your Complete Guide to Safe Hiring & Working",
    excerpt:
      "Discover all the powerful features of SkilledProz - from escrow payments and GPS tracking to video calls and dispute resolution. Your complete guide to the future of gig work.",
    content: `
    <p>SkilledProz is the most comprehensive platform for hiring and working in the gig economy. With 48+ features built-in, we've created a complete ecosystem that protects both hirers and workers. This guide covers every feature you need to know.</p>

    <h2>🛡️ Safety & Security Features</h2>
    
    <h3>Escrow Payments</h3>
    <p>Our escrow system holds funds securely until the job is complete. Hirers deposit payment, workers complete the job, and funds are released automatically upon confirmation. No more payment disputes or fraud.</p>
    
    <h3>Worker Verification</h3>
    <p>Every worker undergoes ID verification, background screening, and certification validation. Verified badges are earned, not given. This ensures you're hiring legitimate professionals.</p>
    
    <h3>Background Checks</h3>
    <p>Workers can submit to comprehensive background checks. Hirers can see the status of these checks, providing an extra layer of trust and security.</p>
    
    <h3>Dispute Resolution</h3>
    <p>Our dedicated team reviews every dispute within 48 hours. Fair outcomes guaranteed with our neutral resolution process.</p>

    <h2>📍 Location & Tracking Features</h2>
    
    <h3>GPS Check-In/Out</h3>
    <p>Workers check in with GPS when they arrive at the job location. Check out confirms departure. Coordinates are logged with timestamps for complete transparency.</p>
    
    <h3>SOS Emergency Alert</h3>
    <p>Workers can trigger an SOS alert that instantly notifies the hirer and our team with their GPS location. Safety is our priority.</p>
    
    <h3>Nearby Worker Search</h3>
    <p>Find workers in your area using our location-based search. Filter by distance, rating, availability, and more.</p>

    <h2>💬 Communication Features</h2>
    
    <h3>Real-Time Messaging</h3>
    <p>End-to-end encrypted messaging between hirers and workers. Every conversation is stored securely with read receipts.</p>
    
    <h3>In-App Video Calls</h3>
    <p>Discuss jobs before they start with built-in video calls. No third-party apps needed. Complete call history and recording.</p>
    
    <h3>AI Translation</h3>
    <p>Communicate across language barriers with our AI-powered translation feature. Available in multiple languages.</p>

    <h2>💰 Payment Features</h2>
    
    <h3>29 Currencies Supported</h3>
    <p>Pay and earn in USD, NGN, EUR, GBP, and 25+ other currencies. Crypto support includes USDC, USDT, BTC, and ETH.</p>
    
    <h3>Multiple Payment Methods</h3>
    <p>Bank transfers, card payments, crypto, and instant withdrawals. Choose what works best for you.</p>
    
    <h3>Multi-Rate Pricing</h3>
    <p>Workers set hourly, daily, weekly, monthly, or custom rates. Hirers lock the rate at booking.</p>

    <h2>📋 Job Management</h2>
    
    <h3>Public Job Board</h3>
    <p>Post jobs publicly. Workers apply. You pick the best match. Full application management included.</p>
    
    <h3>Availability Scheduling</h3>
    <p>Workers set their weekly availability. Hirers see real-time openings and can book accordingly.</p>
    
    <h3>Booking Lifecycle</h3>
    <p>Complete booking management from request to completion. Track every step of the process.</p>

    <h2>👤 Profile & Reputation</h2>
    
    <h3>Verified Worker Profiles</h3>
    <p>Detailed profiles with portfolio, certifications, reviews, and verification status. Build your professional reputation.</p>
    
    <h3>Reviews & Ratings</h3>
    <p>Both parties can leave reviews. Build trust through transparent feedback and ratings.</p>
    
    <h3>Featured Listings</h3>
    <p>Workers can boost visibility with featured listings. Hirers unlock premium tools with subscriptions.</p>

    <h2>🔄 Additional Features</h2>
    
    <h3>Referral Program</h3>
    <p>Refer friends and earn bonuses. Both parties get rewards when referrals sign up and complete jobs.</p>
    
    <h3>Campaign Dashboard</h3>
    <p>Track your referrals, submissions, and earnings. Complete campaign management.</p>
    
    <h3>Insurance Add-on</h3>
    <p>Optional insurance at checkout. Covers damages and liability for both parties.</p>
    
    <h3>Community Posts</h3>
    <p>Share updates, tips, and network with other professionals through our community feed.</p>

    <h2>🛠️ Admin & Management</h2>
    
    <h3>Admin Dashboard</h3>
    <p>Complete platform management including users, bookings, payments, and disputes.</p>
    
    <h3>Audit Log</h3>
    <p>Full transparency with detailed audit logs for all platform activities.</p>
    
    <h3>Broadcast System</h3>
    <p>Send notifications to users. Manage communications at scale.</p>

    <h2>🚀 Getting Started</h2>
    <p>Whether you're hiring or working, SkilledProz has everything you need. Sign up today and experience the complete gig economy platform.</p>
  `,
    author: "SkilledProz Team",
    publishedDate: "2026-08-01",
    readTime: "12 min read",
    image: "/blog/platform-features.jpg",
    category: "Platform Guide",
    tags: [
      "features",
      "platform",
      "guide",
      "safety",
      "payments",
      "verification",
    ],
    likes: 89,
    comments: 14,
  },
  {
    id: "how-to-get-verified-on-skilledproz",
    slug: "how-to-get-verified-on-skilledproz",
    title: "How to Get Verified on SkilledProz: The Complete Guide",
    excerpt:
      "Learn how to get fully verified on SkilledProz as a worker or hirer. Complete guide to ID verification, certifications, background checks, and building trust.",
    content: `
    <p>Verification is the foundation of trust on SkilledProz. This guide explains everything you need to know about getting verified, whether you're a worker or hirer.</p>

    <h2>Why Verification Matters</h2>
    <ul>
      <li><strong>Build Trust</strong> – Verified profiles get more bookings and job offers</li>
      <li><strong>Increase Earnings</strong> – Verified workers earn 40% more on average</li>
      <li><strong>Access Premium Features</strong> – Some features require verification</li>
      <li><strong>Stand Out</strong> – Verified badge separates you from unverified users</li>
    </ul>

    <h2>For Workers: Verification Steps</h2>
    
    <h3>Step 1: ID Verification</h3>
    <p>Submit a clear photo of your government-issued ID (National ID, Driver's License, International Passport, or Voter's Card). Our team verifies the document within 24 hours.</p>
    
    <h3>Step 2: Phone Number Verification</h3>
    <p>Verify your phone number through OTP (One-Time Password) sent via SMS. This confirms you're reachable and committed.</p>
    
    <h3>Step 3: Background Check</h3>
    <p>Submit to our optional background check. This includes criminal record verification and past employment checks. Increases your trust score significantly.</p>
    
    <h3>Step 4: Certification Verification</h3>
    <p>Upload your professional certifications. For electricians, NERC registration. For plumbers, plumbing certifications. We verify each certification with the issuing body.</p>
    
    <h3>Step 5: Portfolio & Video Intro</h3>
    <p>Upload your portfolio projects and record a 30-second video introduction. This helps hirers connect with you personally.</p>

    <h2>For Hirers: Verification Steps</h2>
    
    <h3>Step 1: Business Verification</h3>
    <p>Submit your business registration documents (CAC certificate, TIN, etc.). Verifies your business is legitimate.</p>
    
    <h3>Step 2: Email Verification</h3>
    <p>Verify your email address through our confirmation link. Ensures we can reach you.</p>
    
    <h3>Step 3: Payment Method Verification</h3>
    <p>Link and verify your payment method. Ensures smooth transactions.</p>

    <h2>Verification Tiers</h2>
    <ul>
      <li><strong>🟡 Basic</strong> – Email and phone verified</li>
      <li><strong>🟢 Standard</strong> – ID verified + email and phone</li>
      <li><strong>🔵 Premium</strong> – Full verification including certifications and background check</li>
    </ul>

    <h2>Verification Tips</h2>
    <ul>
      <li><strong>Be Clear</strong> – Upload clear, well-lit photos of your documents</li>
      <li><strong>Be Complete</strong> – Submit all requested documents for faster approval</li>
      <li><strong>Be Prompt</strong> – Respond to verification requests quickly</li>
      <li><strong>Keep Updated</strong> – Renew expired certifications promptly</li>
    </ul>

    <h2>Common Verification Questions</h2>
    <ul>
      <li><strong>How long does verification take?</strong> – 24-48 hours for ID verification, 3-5 days for background checks</li>
      <li><strong>Is verification free?</strong> – Basic verification is free. Premium verification has a small fee</li>
      <li><strong>What if I'm rejected?</strong> – You'll receive feedback and can reapply</li>
      <li><strong>Is my data secure?</strong> – Yes, all documents are encrypted and stored securely</li>
    </ul>

    <h2>Start Your Verification Today</h2>
    <p>Verification is your key to success on SkilledProz. Complete your verification now and unlock the full potential of the platform.</p>
  `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-28",
    readTime: "8 min read",
    image: "/blog/verification-guide.jpg",
    category: "Verification",
    tags: [
      "verification",
      "ID check",
      "background check",
      "certifications",
      "trust",
    ],
    likes: 112,
    comments: 21,
  },
  {
    id: "escrow-payments-protect-your-money",
    slug: "escrow-payments-protect-your-money",
    title: "Escrow Payments: How They Protect Your Money on SkilledProz",
    excerpt:
      "Learn how SkilledProz escrow protection keeps your money safe. Complete guide to how escrow works, benefits for hirers and workers, and why it's the future of gig payments.",
    content: `
    <p>Escrow payments are the backbone of trust on SkilledProz. This guide explains everything you need to know about how escrow protects your money.</p>

    <h2>What is Escrow?</h2>
    <p>Escrow is a financial arrangement where a neutral third party holds funds until both parties fulfill their obligations. On SkilledProz, we hold payment securely until the job is complete and confirmed.</p>

    <h2>How Escrow Works on SkilledProz</h2>
    <ol>
      <li><strong>Hirer posts a job</strong> – Describes the work and sets the budget</li>
      <li><strong>Worker accepts</strong> – Agrees to the terms and price</li>
      <li><strong>Hirer funds escrow</strong> – Deposits the full payment amount</li>
      <li><strong>Worker completes work</strong> – Performs the job to agreed standards</li>
      <li><strong>Hirer confirms</strong> – Verifies work is complete and satisfactory</li>
      <li><strong>Payment releases</strong> – Worker receives money automatically</li>
    </ol>

    <h2>Benefits for Hirers</h2>
    <ul>
      <li><strong>💰 Money is safe</strong> – Payment only released when you're satisfied</li>
      <li><strong>🔍 Quality assurance</strong> – Workers complete job before getting paid</li>
      <li><strong>⚖️ Dispute protection</strong> – Your money is protected if issues arise</li>
      <li><strong>📊 Transparency</strong> – See exactly where your money is at all times</li>
    </ul>

    <h2>Benefits for Workers</h2>
    <ul>
      <li><strong>✅ Payment certainty</strong> – Know the money is there and waiting</li>
      <li><strong>🛡️ Non-payment protection</strong> – No more chasing clients for payment</li>
      <li><strong>🏆 Professional reputation</strong> – Escrow use shows you're trustworthy</li>
      <li><strong>🚀 Faster payment</strong> – Money released immediately after confirmation</li>
    </ul>

    <h2>Supported Currencies</h2>
    <ul>
      <li><strong>Fiat:</strong> USD, EUR, GBP, NGN, GHS, KES, ZAR, and 20+ more</li>
      <li><strong>Crypto:</strong> USDC, USDT, BTC, ETH</li>
      <li><strong>Payment Methods:</strong> Bank transfer, card, crypto, instant withdrawal</li>
    </ul>

    <h2>Escrow vs Other Payment Methods</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Escrow</th>
          <th>Upfront</th>
          <th>After Payment</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Hirer protection</td><td>✅</td><td>❌</td><td>✅</td></tr>
        <tr><td>Worker protection</td><td>✅</td><td>✅</td><td>❌</td></tr>
        <tr><td>Dispute resolution</td><td>✅</td><td>❌</td><td>❌</td></tr>
        <tr><td>Fraud prevention</td><td>✅</td><td>❌</td><td>❌</td></tr>
      </tbody>
    </table>

    <h2>Escrow Fees</h2>
    <p>SkilledProz charges a small fee for escrow services. This covers payment processing, security, and dispute resolution. The fee is transparent and displayed before you confirm any transaction.</p>

    <h2>Dispute Resolution Process</h2>
    <ol>
      <li>Either party can raise a dispute</li>
      <li>Our team reviews all evidence within 48 hours</li>
      <li>Decision is made based on platform guidelines</li>
      <li>Funds are released or refunded accordingly</li>
    </ol>

    <h2>Start Using Escrow Today</h2>
    <p>Escrow is available for all jobs on SkilledProz. Sign up today and experience secure, hassle-free transactions.</p>
  `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-27",
    readTime: "7 min read",
    image: "/blog/escrow-guide.jpg",
    category: "Payments",
    tags: ["escrow", "payments", "security", "crypto", "bank transfer"],
    likes: 134,
    comments: 28,
  },
  {
    id: "gps-tracking-safety-for-workers",
    slug: "gps-tracking-safety-for-workers",
    title: "GPS Tracking & Safety: How SkilledProz Protects Workers",
    excerpt:
      "Learn how SkilledProz uses GPS tracking and SOS alerts to keep workers safe. Complete guide to our safety features and how they protect you on every job.",
    content: `
    <p>Worker safety is our top priority at SkilledProz. This guide covers all our safety features including GPS tracking, SOS alerts, and emergency protocols.</p>

    <h2>GPS Tracking Features</h2>
    
    <h3>GPS Check-In</h3>
    <p>Workers check in using GPS when they arrive at the job location. This confirms their presence and starts the job timer. Hirers receive instant notification of arrival.</p>
    
    <h3>GPS Check-Out</h3>
    <p>Workers check out when the job is complete. This confirms departure and stops the timer. Coordinates are logged with timestamps.</p>
    
    <h3>Location History</h3>
    <p>Complete location history is stored for every job. Both parties can view this for transparency and safety.</p>

    <h2>SOS Emergency Alert</h2>
    
    <h3>How It Works</h3>
    <p>Workers can trigger an SOS alert with a single tap. This instantly sends:</p>
    <ul>
      <li><strong>📱 Push Notification</strong> – To the hirer</li>
      <li><strong>📧 Email Alert</strong> – To the hirer and SkilledProz team</li>
      <li><strong>📍 GPS Location</strong> – Current coordinates of the worker</li>
      <li><strong>🆘 Emergency Contacts</strong> – Pre-set emergency contacts notified</li>
    </ul>
    
    <h3>When to Use SOS</h3>
    <ul>
      <li><strong>🚨 Feeling unsafe</strong> – Trust your instincts</li>
      <li><strong>⚠️ Harassment</strong> – Verbal or physical harassment</li>
      <li><strong>🏥 Medical emergency</strong> – Illness or injury on the job</li>
      <li><strong>🔒 Security threat</strong> – Theft, violence, or threats</li>
    </ul>

    <h2>Setting Up Emergency Contacts</h2>
    <ol>
      <li>Go to Settings → Emergency Contacts</li>
      <li>Add primary and secondary contacts</li>
      <li>Save their phone numbers and email addresses</li>
      <li>Contacts will be notified during SOS alerts</li>
    </ol>

    <h2>Safety Tips for Workers</h2>
    <ul>
      <li><strong>📍 Share location</strong> – Let someone know where you're going</li>
      <li><strong>📱 Keep phone charged</strong> – Ensure your device has battery</li>
      <li><strong>🔄 Update status</strong> – Keep your GPS enabled and check in</li>
      <li><strong>🔔 Use SOS</strong> – Don't hesitate to use SOS if you feel unsafe</li>
    </ul>

    <h2>Safety Tips for Hirers</h2>
    <ul>
      <li><strong>🏠 Prepare the site</strong> – Ensure safe working conditions</li>
      <li><strong>📋 Clear instructions</strong> – Provide detailed job specifications</li>
      <li><strong>🤝 Professional conduct</strong> – Treat workers with respect</li>
      <li><strong>📱 Respond to SOS</strong> – Check on workers if you receive alerts</li>
    </ul>

    <h2>Insurance Protection</h2>
    <p>SkilledProz offers optional insurance add-on at checkout. This covers:</p>
    <ul>
      <li><strong>🛡️ Liability insurance</strong> – For damages or injuries</li>
      <li><strong>🔧 Tool protection</strong> – Covers worker tools</li>
      <li><strong>📦 Theft coverage</strong> – For materials and equipment</li>
    </ul>

    <h2>Our Commitment to Safety</h2>
    <p>SkilledProz is committed to worker safety. We continuously improve our safety features and respond to emergencies immediately. Your safety is our priority.</p>
  `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-26",
    readTime: "9 min read",
    image: "/blog/gps-safety.jpg",
    category: "Safety",
    tags: ["GPS", "safety", "SOS", "tracking", "emergency", "insurance"],
    likes: 167,
    comments: 35,
  },
  {
    id: "maximize-earnings-on-skilledproz",
    slug: "maximize-earnings-on-skilledproz",
    title: "How to Maximize Your Earnings on SkilledProz",
    excerpt:
      "Complete guide to maximizing your earnings as a worker on SkilledProz. Learn about multi-rate pricing, featured listings, subscriptions, and proven strategies.",
    content: `
    <p>SkilledProz offers workers multiple ways to increase their earnings. This guide covers all the tools and strategies to maximize your income.</p>

    <h2>1. Multi-Rate Pricing</h2>
    <p>Set different rates for different time commitments:</p>
    <ul>
      <li><strong>💰 Hourly Rate</strong> – For short, quick jobs</li>
      <li><strong>📅 Daily Rate</strong> – For full-day projects</li>
      <li><strong>📆 Weekly Rate</strong> – For ongoing work</li>
      <li><strong>📊 Monthly Rate</strong> – For long-term commitments</li>
      <li><strong>🎯 Custom Rate</strong> – For specific project quotes</li>
    </ul>

    <h2>2. Featured Listings</h2>
    <p>Boost your visibility with featured listings:</p>
    <ul>
      <li><strong>🔝 Top of Search</strong> – Appear first in search results</li>
      <li><strong>🏷️ Highlighted Profile</strong> – Stand out with special badges</li>
      <li><strong>📣 Increased Visibility</strong> – Get seen by more hirers</li>
    </ul>
    <p>Featured workers get 3x more bookings and earn 2x more on average.</p>

    <h2>3. Premium Verification</h2>
    <p>Complete your verification to unlock premium benefits:</p>
    <ul>
      <li><strong>✅ Trust Badge</strong> – Verified workers are trusted more</li>
      <li><strong>🔐 Background Check</strong> – Shows you're reliable</li>
      <li><strong>📜 Certifications</strong> – Prove your expertise</li>
    </ul>
    <p>Fully verified workers earn 40% more than unverified workers.</p>

    <h2>4. Portfolio & Reviews</h2>
    <ul>
      <li><strong>📷 Portfolio photos</strong> – Show your best work</li>
      <li><strong>⭐ Positive reviews</strong> – Build your reputation</li>
      <li><strong>🎥 Video intro</strong> – Connect with hirers personally</li>
    </ul>
    <p>Workers with 10+ reviews earn 60% more than those with no reviews.</p>

    <h2>5. Subscriptions</h2>
    <p>Subscribe to unlock premium features:</p>
    <ul>
      <li><strong>📊 Analytics Dashboard</strong> – Track your performance</li>
      <li><strong>🎯 Priority Support</strong> – Faster help when you need it</li>
      <li><strong>🔓 Exclusive Features</strong> – Early access to new tools</li>
    </ul>

    <h2>6. Referral Program</h2>
    <p>Earn bonuses by referring others:</p>
    <ul>
      <li><strong>👥 Refer workers</strong> – Earn ₦2,000 per referral</li>
      <li><strong>🏢 Refer hirers</strong> – Earn ₦2,000 per referral</li>
      <li><strong>♾️ Unlimited Referrals</strong> – No limit on earnings</li>
    </ul>

    <h2>7. Campaign Dashboard</h2>
    <p>Participate in campaigns and earn extra:</p>
    <ul>
      <li><strong>📋 Complete tasks</strong> – Earn for completing tasks</li>
      <li><strong>🏆 Top performers</strong> – Bonuses for top performers</li>
      <li><strong>💰 Withdraw earnings</strong> – Cash out your rewards</li>
    </ul>

    <h2>8. Complete Your Profile</h2>
    <p>100% complete profiles get more bookings:</p>
    <ul>
      <li><strong>📝 Bio</strong> – Tell hirers about yourself</li>
      <li><strong>🛠️ Skills</strong> – List all your skills and trades</li>
      <li><strong>📈 Experience</strong> – Share your work history</li>
      <li><strong>📸 Photos</strong> – Upload profile and work photos</li>
    </ul>

    <h2>9. Quick Response Time</h2>
    <p>Respond to booking requests quickly:</p>
    <ul>
      <li><strong>⚡ Under 5 minutes</strong> – Best response time</li>
      <li><strong>📱 Notifications on</strong> – Get instant alerts</li>
      <li><strong>🤝 Accept requests</strong> – Higher acceptance rate = more bookings</li>
    </ul>

    <h2>10. Stay Active</h2>
    <p>Regular activity increases your visibility:</p>
    <ul>
      <li><strong>📊 Update availability</strong> – Keep your calendar current</li>
      <li><strong>📝 Post updates</strong> – Share achievements</li>
      <li><strong>💬 Engage</strong> – Respond to messages promptly</li>
    </ul>

    <h2>Start Maximizing Today</h2>
    <p>Apply these strategies and watch your earnings grow. Sign up for SkilledProz and start maximizing your income today.</p>
  `,
    author: "SkilledProz Team",
    publishedDate: "2026-07-25",
    readTime: "10 min read",
    image: "/blog/maximize-earnings.jpg",
    category: "Workers Guide",
    tags: ["earnings", "pricing", "featured", "subscription", "referral"],
    likes: 145,
    comments: 27,
  },
];

export default function BlogPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [posts, setPosts] = useState(BLOG_POSTS);
  const [currentPost, setCurrentPost] = useState(null);

  useEffect(() => {
    if (slug) {
      const post = BLOG_POSTS.find((p) => p.slug === slug);
      if (post) {
        setCurrentPost(post);
        window.scrollTo(0, 0);
      } else {
        navigate("/blog");
      }
    } else {
      setCurrentPost(null);
      // Filter posts based on search and category
      let filtered = BLOG_POSTS;
      if (searchTerm) {
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        );
      }
      if (selectedCategory !== "All") {
        filtered = filtered.filter((p) => p.category === selectedCategory);
      }
      setPosts(filtered);
    }
  }, [slug, searchTerm, selectedCategory, navigate]);

  // Get unique categories
  const categories = ["All", ...new Set(BLOG_POSTS.map((p) => p.category))];

  // Share functions
  const shareOnTwitter = (post) => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`,
      "_blank",
    );
  };

  const shareOnFacebook = (post) => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      "_blank",
    );
  };

  const shareOnLinkedIn = (post) => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      "_blank",
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  // Single Post View
  if (currentPost) {
    return (
      <>
        <SEO
          title={currentPost.title}
          description={currentPost.excerpt}
          keywords={currentPost.tags.join(", ")}
          canonical={`https://skilledproz.com/blog/${currentPost.slug}`}
          ogImage="https://skilledproz.com/og-image.jpg"
          ogType="article"
          author={currentPost.author}
          publishedDate={currentPost.publishedDate}
          articleSection={currentPost.category}
          tags={currentPost.tags}
        />

        <div className={styles.blogPage}>
          <div className={styles.container}>
            <div className={styles.backButton}>
              <button
                onClick={() => navigate("/blog")}
                className={styles.backBtn}
              >
                <FaArrowLeft /> Back to Blog
              </button>
            </div>

            <article className={styles.singlePost}>
              {/* Header */}
              <div className={styles.postHeader}>
                <div className={styles.postMeta}>
                  <span className={styles.postCategory}>
                    {currentPost.category}
                  </span>
                  <span className={styles.postDate}>
                    <FaCalendarAlt />{" "}
                    {new Date(currentPost.publishedDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                  <span className={styles.postReadTime}>
                    <FaClock /> {currentPost.readTime}
                  </span>
                </div>
                <h1 className={styles.postTitle}>{currentPost.title}</h1>
                <div className={styles.postAuthor}>
                  <FaUser />
                  <span>{currentPost.author}</span>
                </div>
              </div>

              {/* Share Buttons */}
              <div className={styles.shareButtons}>
                <button
                  onClick={() => shareOnTwitter(currentPost)}
                  className={styles.shareTwitter}
                >
                  <FaTwitter /> Tweet
                </button>
                <button
                  onClick={() => shareOnFacebook(currentPost)}
                  className={styles.shareFacebook}
                >
                  <FaFacebook /> Share
                </button>
                <button
                  onClick={() => shareOnLinkedIn(currentPost)}
                  className={styles.shareLinkedIn}
                >
                  <FaLinkedin /> Post
                </button>
                <button onClick={copyLink} className={styles.shareLink}>
                  <FaLink /> Copy Link
                </button>
              </div>

              {/* Content */}
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: currentPost.content }}
              />

              {/* Tags */}
              <div className={styles.postTags}>
                {currentPost.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    <FaTag /> {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className={styles.postFooter}>
                <div className={styles.postEngagement}>
                  <span className={styles.engagementItem}>
                    <FaStar /> {currentPost.likes} Likes
                  </span>
                  <span className={styles.engagementItem}>
                    <FaComments /> {currentPost.comments} Comments
                  </span>
                </div>
              </div>
            </article>

            {/* Related Posts */}
            <div className={styles.relatedPosts}>
              <h3 className={styles.relatedTitle}>You might also like</h3>
              <div className={styles.relatedGrid}>
                {BLOG_POSTS.filter((p) => p.id !== currentPost.id)
                  .slice(0, 3)
                  .map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className={styles.relatedCard}
                    >
                      <h4>{post.title}</h4>
                      <p>{post.excerpt.substring(0, 100)}...</p>
                      <span className={styles.relatedReadMore}>
                        Read More →
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Blog List View
  return (
    <>
      <SEO
        title="SkilledProz Blog - Hiring Guides, Tips & Industry Insights"
        description="Expert advice on hiring skilled workers, verifying professionals, and navigating the gig economy in Nigeria and beyond."
        keywords="blog, hiring tips, skilled workers, verification, gig economy, Nigeria"
        canonical="https://skilledproz.com/blog"
        ogImage="https://skilledproz.com/og-image.jpg"
        ogType="website"
        author="SkilledProz"
      />

      <div className={styles.blogPage}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.blogHeader}>
            <div className={styles.blogHeaderContent}>
              <span className={styles.blogBadge}>📝 Insights & Guides</span>
              <h1 className={styles.blogTitle}>SkilledProz Blog</h1>
              <p className={styles.blogSubtitle}>
                Expert advice on hiring, working, and thriving in the gig
                economy
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className={styles.searchFilter}>
            <div className={styles.searchBar}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterButtons}>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`${styles.filterBtn} ${selectedCategory === category ? styles.active : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Blog Grid */}
          {posts.length > 0 ? (
            <div className={styles.blogGrid}>
              {posts.map((post) => (
                <article key={post.id} className={styles.blogCard}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardCategory}>
                        {post.category}
                      </span>
                      <span className={styles.cardDate}>
                        <FaCalendarAlt />{" "}
                        {new Date(post.publishedDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>
                    <h2 className={styles.cardTitle}>
                      <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                    <div className={styles.cardFooter}>
                      <div className={styles.cardAuthor}>
                        <FaUser />
                        <span>{post.author}</span>
                      </div>
                      <Link
                        to={`/blog/${post.slug}`}
                        className={styles.cardReadMore}
                      >
                        Read More <FaArrowRight />
                      </Link>
                    </div>
                    <div className={styles.cardTags}>
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.cardTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              <p>No articles found matching your search.</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                className={styles.clearSearchBtn}
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
