import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { FiBookmark, FiChevronDown, FiFilter, FiSearch, FiSliders, FiX } from "react-icons/fi";
import { CompanyCard } from "@/components/nex/CompanyCard";
import { DirectoryNavbar } from "@/components/nex/DirectoryNavbar";
import { INDUSTRIES, REGIONS, STAGES } from "@/data/companies";
import { fetchStartups } from "@/lib/api/startupClient";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/startups")({
  component: StartupDirectory,
});

const INITIAL_FILTERS = {
  industries: [],
  stages: [],
  regions: [],
  hiring: false,
  top: false,
};

export function StartupDirectory({ showNavbar = true, workspace = false }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sort, setSort] = useState("recommended");
  const { isBookmarked, toggleBookmark, count: savedCount } = useBookmarks();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalogStatus("loading");
    setCatalogError("");

    fetchStartups()
      .then((response) => {
        if (!active) return;
        const list = Array.isArray(response?.startups)
          ? response.startups
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setCatalog(list);
        setCatalogStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(error instanceof Error ? error.message : "Could not load startups.");
        setCatalogStatus("error");
      });

    return () => {
      active = false;
    };
  }, [requestVersion]);

  const companies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const list = Array.isArray(catalog) ? catalog : [];
    const filtered = list.filter((company) => {
      if (!company) return false;
      const searchable = [
        company.name,
        company.description,
        company.industry,
        company.location,
        company.founder,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (!filters.industries.length || filters.industries.includes(company.industry)) &&
        (!filters.stages.length || filters.stages.includes(company.stage)) &&
        (!filters.regions.length || filters.regions.some((region) => inRegion(company, region))) &&
        (!filters.hiring || Boolean(company.hiring)) &&
        (!filters.top || Boolean(company.top))
      );
    });

    return [...filtered].sort((left, right) => {
      if (sort === "growth") return (right.growth || 0) - (left.growth || 0);
      if (sort === "newest") return (right.founded || 0) - (left.founded || 0);
      if (sort === "team") return (right.team || 0) - (left.team || 0);
      return Number(right.top) - Number(left.top) || (right.growth || 0) - (left.growth || 0);
    });
  }, [catalog, filters, query, sort]);

  const activeCount =
    filters.industries.length +
    filters.stages.length +
    filters.regions.length +
    Number(filters.hiring) +
    Number(filters.top);

  function toggleList(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  return (
    <main className={cn("min-h-screen bg-background text-foreground", workspace && "lg:pl-64")}>
      {showNavbar ? <DirectoryNavbar /> : null}

      <section
        className={cn(
          "relative overflow-hidden border-b border-foreground/8 px-5 pb-14 sm:px-8 sm:pb-18",
          showNavbar ? "pt-15 sm:pt-20" : "pt-12 sm:pt-16",
        )}
      >
        <div className="directory-orbit pointer-events-none absolute -right-32 -top-72 size-[620px] rounded-full" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_420px] lg:items-end"
        >
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full bg-success" /> Live company network
            </p>
            <h1 className="mt-5 max-w-4xl text-[clamp(3.1rem,7.5vw,7rem)] leading-[0.9] font-semibold tracking-[-0.075em]">
              Find the company <span className="font-serif font-normal italic">before</span> the
              crowd.
            </h1>
          </div>
          <div className="border-l border-foreground/15 pl-6 sm:pl-8">
            <p className="text-base leading-7 text-muted-foreground">
              A curated network of ambitious startups, built for founders finding peers and
              investors searching for their next conviction.
            </p>
            <div id="signals" className="mt-7 grid grid-cols-3 gap-6">
              <Metric value="1,240+" label="Companies" />
              <Metric value="$2.8B" label="Raised" />
              <Metric value="38%" label="Hiring" />
            </div>
          </div>
        </motion.div>
      </section>

      <section id="companies" className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex h-13 flex-1 items-center rounded-xl border border-foreground/12 bg-card transition-shadow focus-within:border-foreground/30 focus-within:shadow-[0_8px_30px_-20px_rgba(17,24,39,.4)]">
            <FiSearch className="absolute left-4 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search companies, sectors, founders, or cities"
              className="h-full w-full bg-transparent pl-11 pr-10 text-sm outline-none placeholder:text-muted-foreground/75"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 p-1"
                aria-label="Clear search"
              >
                <FiX />
              </button>
            ) : (
              <span className="absolute right-4 hidden rounded-md border border-foreground/10 px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:block">
                ⌘ K
              </span>
            )}
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMobileFilters(true)}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl border border-foreground/12 bg-card px-4 text-sm font-semibold lg:hidden"
            >
              <FiFilter /> Filters {activeCount ? `(${activeCount})` : ""}
            </button>
            <label className="relative flex h-13 min-w-42 items-center rounded-xl border border-foreground/12 bg-card">
              <FiSliders className="absolute left-4 size-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-full w-full appearance-none bg-transparent pl-11 pr-9 text-sm font-semibold outline-none"
                aria-label="Sort companies"
              >
                <option value="recommended">Recommended</option>
                <option value="growth">Fastest growth</option>
                <option value="newest">Newest</option>
                <option value="team">Team size</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 size-4" />
            </label>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="sticky top-26 hidden rounded-[1.35rem] border border-foreground/10 bg-card p-5 lg:block">
            <FilterContent
              catalog={catalog}
              filters={filters}
              setFilters={setFilters}
              toggleList={toggleList}
            />
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Showing <span className="font-bold text-foreground">{companies.length}</span>{" "}
                curated companies
              </p>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FiBookmark /> {savedCount || 0} saved
              </span>
            </div>

            {catalogStatus === "loading" ? (
              <div className="space-y-3" aria-label="Loading startups">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-44 animate-pulse rounded-[1.35rem] border border-foreground/8 bg-card"
                  />
                ))}
              </div>
            ) : catalogStatus === "error" ? (
              <div className="rounded-[1.35rem] border border-destructive/25 bg-destructive/5 px-6 py-16 text-center">
                <p className="text-xl font-semibold">The company network is unavailable.</p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  {catalogError}
                </p>
                <button
                  type="button"
                  onClick={() => setRequestVersion((current) => current + 1)}
                  className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
                >
                  Retry connection
                </button>
              </div>
            ) : companies.length ? (
              <div className="space-y-3">
                {companies.map((company, index) => (
                  <CompanyCard
                    key={company.id || company._id}
                    company={company}
                    saved={isBookmarked(company.id || company._id)}
                    onSave={toggleBookmark}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-foreground/20 px-6 py-20 text-center">
                <p className="text-xl font-semibold">No companies match that signal.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try removing a filter or widening your search.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilters(INITIAL_FILTERS);
                  }}
                  className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
                >
                  Reset discovery
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {mobileFilters ? (
          <>
            <motion.button
              aria-label="Close filters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilters(false)}
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-50 w-[min(88vw,380px)] overflow-y-auto bg-background p-6 shadow-2xl lg:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <p className="text-lg font-semibold">Discovery filters</p>
                <button
                  onClick={() => setMobileFilters(false)}
                  className="flex size-9 items-center justify-center rounded-full border border-foreground/10"
                  aria-label="Close filters"
                >
                  <FiX />
                </button>
              </div>
              <FilterContent
                catalog={catalog}
                filters={filters}
                setFilters={setFilters}
                toggleList={toggleList}
              />
              <button
                onClick={() => setMobileFilters(false)}
                className="mt-8 h-12 w-full rounded-full bg-foreground text-sm font-semibold text-background"
              >
                View {companies.length} companies
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Metric({ value, label }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function FilterContent({ catalog, filters, setFilters, toggleList }) {
  const safeList = Array.isArray(catalog) ? catalog : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.13em] uppercase">Filter signals</p>
        <button
          type="button"
          onClick={() => setFilters(INITIAL_FILTERS)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <Toggle
          checked={filters.top}
          onChange={() => setFilters((current) => ({ ...current, top: !current.top }))}
          label="Top companies"
          count={safeList.filter((company) => Boolean(company?.top)).length}
        />
        <Toggle
          checked={filters.hiring}
          onChange={() => setFilters((current) => ({ ...current, hiring: !current.hiring }))}
          label="Actively hiring"
          count={safeList.filter((company) => Boolean(company?.hiring)).length}
        />
      </div>

      <FilterGroup
        label="Stage"
        catalog={safeList}
        items={STAGES}
        selected={filters.stages}
        onToggle={(item) => toggleList("stages", item)}
      />
      <FilterGroup
        label="Industry"
        catalog={safeList}
        items={INDUSTRIES}
        selected={filters.industries}
        onToggle={(item) => toggleList("industries", item)}
      />
      <FilterGroup
        label="Region"
        catalog={safeList}
        items={REGIONS}
        selected={filters.regions}
        onToggle={(item) => toggleList("regions", item)}
      />
    </div>
  );
}

function FilterGroup({ catalog, label, items, selected, onToggle }) {
  const safeList = Array.isArray(catalog) ? catalog : [];

  return (
    <div className="mt-6 border-t border-foreground/8 pt-5">
      <p className="mb-3 text-xs font-bold tracking-[0.1em] uppercase">{label}</p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <Toggle
            key={item}
            checked={selected.includes(item)}
            onChange={() => onToggle(item)}
            label={item}
            count={
              safeList.filter((company) => {
                if (!company) return false;
                if (label === "Stage") return company.stage === item;
                if (label === "Industry") return company.industry === item;
                return inRegion(company, item);
              }).length
            }
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-[4px] border transition-colors",
          checked ? "border-foreground bg-foreground" : "border-foreground/20 bg-background",
        )}
      >
        {checked ? <span className="size-1.5 rounded-full bg-background" /> : null}
      </span>
      <span className={cn("flex-1", checked ? "font-semibold" : "text-muted-foreground")}>
        {label}
      </span>
      <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
    </label>
  );
}

function inRegion(company, region) {
  const loc = typeof company?.location === "string" ? company.location : "";
  if (region === "India") return loc.includes("India");
  if (region === "USA") return loc.includes("USA");
  if (region === "Canada") return loc.includes("Canada");
  if (region === "Asia Pacific")
    return ["Singapore", "Australia"].some((place) => loc.includes(place));
  return ["UK", "Germany", "France", "Netherlands"].some((place) => loc.includes(place));
}
