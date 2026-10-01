import { ArrowRight01Icon, CloudUploadIcon } from "@hugeicons/core-free-icons";
import { ActionCard, BrandMark, Button, Chip, ListCard, MeterCard, TextLink } from "@puckoops/camelot";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectedFigure, OutstandingFigure } from "@/components/landing/Figures";
import styles from "./landing.module.css";

export const metadata: Metadata = { title: "Orbit — studio operations, one ledger" };

const gbp = (major: number) => `£${major.toLocaleString("en-GB")}`;

function Nav() {
  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand}>
          <BrandMark size={22} />
          <span>ORBIT</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Site">
          <a href="#product">Product</a>
          <a href="#studios">Studios</a>
          <a href="#pricing">Pricing</a>
          <a href="#changelog">Changelog</a>
        </nav>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signIn}>
            Sign in
          </Link>
          <Button asChild variant="primary">
            <Link href="/dashboard">Open the tracker</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProductFrame() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.frameBar}>
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className="num-sm text-4">orbit / dashboard</span>
      </div>
      <div className={styles.frameBody}>
        <ul className={styles.frameNav}>
          {["Dashboard", "Tracker", "Calendar", "Payments", "Obligations", "Inventory"].map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className={styles.frameMain}>
          <OutstandingFigure />
          <ListCard
            title="This month"
            caption="Four frozen numbers, one list."
            rows={[
              { label: "Active projects", value: 17 },
              { label: "Hours logged", value: 312 },
              { label: "Invoices issued", value: 8 },
              { label: "Files added", value: 23 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Capability({
  eyebrow,
  title,
  body,
  href,
  link,
  card,
  flip,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  link: string;
  card: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section className={`${styles.capability} ${flip ? styles.flip : ""} reveal`}>
      <div className={styles.capCopy}>
        <p className="caps text-4">{eyebrow}</p>
        <h2 className="display">{title}</h2>
        <p className={`body-lg ${styles.capBody}`}>{body}</p>
        <TextLink href={href} arrow="forward">
          {link}
        </TextLink>
      </div>
      <div className={styles.capCard}>{card}</div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className={styles.page}>
      <Nav />
      <main>
        <section className={styles.hero}>
          <div className={styles.washWarm} />
          <div className={styles.washCool} />
          <p className={`caps ${styles.eyebrow}`}>Studio operations, one ledger</p>
          <h1 className={`hero-xl ${styles.headline}`}>
            <span>Every client, every hour,</span>
            <span>every invoice, accounted for.</span>
          </h1>
          <p className={`body-lg ${styles.subhead}`}>
            Keep clients, projects, work, money and files in a single tracker, so nothing slips between the studio and the books.
          </p>
          <div className={styles.heroActions}>
            <Button asChild variant="primary" size="lg">
              <Link href="/dashboard">Open the tracker</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/tracker">See the board</Link>
            </Button>
          </div>
        </section>

        <div className={styles.frameWrap} id="product">
          <ProductFrame />
        </div>

        <div className={styles.container}>
          <Capability
            eyebrow="Work"
            title="A board that tells the truth"
            body="Six statuses, no more. Re-do is a first-class column so rework is visible instead of hidden inside In Progress."
            href="/tracker"
            link="Open the board"
            card={
              <ListCard
                title="Open work"
                caption="24 items"
                rows={[
                  { label: "Brand system rollout", value: <Chip tone="blue" glyph="circle-half">In Progress</Chip> },
                  { label: "Cover typography", value: <Chip tone="amber" glyph="redo">Re-do</Chip> },
                  { label: "Identity guidelines", value: <Chip tone="teal" glyph="check">Done</Chip> },
                ]}
              />
            }
          />
          <Capability
            flip
            eyebrow="Money"
            title="Owed and owing in one ledger"
            body="Payable and receivable share a table, so the net position is a fact rather than a spreadsheet exercise."
            href="/obligations"
            link="See the ledger"
            card={
              <ListCard
                title="Net position"
                caption={gbp(39180)}
                rows={[
                  { label: "Invoice 2041", value: <Chip tone="red" glyph="triangle">Overdue</Chip> },
                  { label: "Invoice 2044", value: <Chip tone="blue" glyph="circle-half">Issued</Chip> },
                  { label: "Invoice 2042", value: <Chip tone="teal" glyph="check">Paid</Chip> },
                ]}
              />
            }
          />
          <Capability
            eyebrow="Files"
            title="One inventory, tagged at the door"
            body="Files are tagged to a client and a category on upload, so the folder view is assembled rather than maintained."
            href="/inventory"
            link="Browse the inventory"
            card={
              <ListCard
                title="In inventory"
                caption="42 files"
                rows={[
                  { label: "Contracts", value: <Chip tone="teal" glyph="check">Ready</Chip> },
                  { label: "Deliverables", value: <Chip tone="teal" glyph="check">Ready</Chip> },
                  { label: "Receipts", value: <Chip glyph="circle">Queued</Chip> },
                ]}
              />
            }
          />

          <section className={`${styles.bento} reveal`}>
            <p className="caps text-4">The system composes</p>
            <h2 className="display">Five cards, four archetypes, three spans.</h2>
            <p className={`body-lg ${styles.capBody}`}>Figure, List, Meter and Action sit on one grid without blending into each other.</p>
            <div className={styles.bentoGrid}>
              <CollectedFigure className={styles.span5} />
              <ListCard
                title="Due this week"
                rows={[
                  { label: "Invoice 2041", value: gbp(14200) },
                  { label: "Insurance renewal", value: gbp(1880) },
                  { label: "Print deposit", value: gbp(3400) },
                  { label: "Invoice 2044", value: gbp(9600) },
                ]}
                className={styles.span4}
              />
              <div className={`${styles.span3} ${styles.stack}`}>
                <MeterCard title="Capacity" percent={78} />
                <ActionCard icon={CloudUploadIcon} title="Upload files" caption="Drop a contract or a receipt." href="/inventory" />
              </div>
            </div>
            <div className={styles.inlineClose}>
              <p className="quote">One tracker. No spreadsheet archaeology.</p>
              <Button asChild variant="primary" iconEnd={ArrowRight01Icon}>
                <Link href="/dashboard">Open the tracker</Link>
              </Button>
            </div>
          </section>

          <section className={`${styles.testimonial} reveal`} id="studios">
            <blockquote className="quote">
              “We stopped reconciling three tools at month end. The obligations table is the whole conversation now.”
            </blockquote>
          </section>

          <section className={`${styles.stats} reveal`}>
            <div>
              <p className="kpi">42</p>
              <p className="small text-3">Files filed and tagged this quarter</p>
            </div>
            <div>
              <p className="kpi">27 days</p>
              <p className="small text-3">Average time from invoice to payment</p>
            </div>
            <div>
              <p className="kpi">6</p>
              <p className="small text-3">Clients tracked end to end</p>
            </div>
          </section>
        </div>

        <section className={styles.close} id="pricing">
          <div className={styles.washWarm} />
          <h2 className="display">Start with one client folder.</h2>
          <p className={`body-lg ${styles.subhead}`}>Import six clients, a handful of invoices and a folder of files. The rest follows.</p>
          <div className={styles.heroActions}>
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">Open the tracker</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/clients">Browse clients</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className={styles.footer} id="changelog">
        <div className={styles.footerInner}>
          <div>
            <Link href="/" className={styles.brand}>
              <BrandMark size={20} />
              <span>ORBIT</span>
            </Link>
            <p className="small text-4">A Puckoops product.</p>
          </div>
          {[
            { h: "Product", l: [["Dashboard", "/dashboard"], ["Tracker", "/tracker"], ["Payments", "/payments"], ["Inventory", "/inventory"]] },
            { h: "Studio", l: [["About", "#"], ["Changelog", "#changelog"], ["Pricing", "#pricing"], ["Status", "#"]] },
            { h: "Legal", l: [["Terms", "#"], ["Privacy", "#"], ["Security", "#"], ["Contact", "mailto:hello@puckoops.com"]] },
          ].map((col) => (
            <div key={col.h}>
              <p className="caps text-4">{col.h}</p>
              <ul className={styles.footerLinks}>
                {col.l.map(([label, href]) => (
                  <li key={label}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
