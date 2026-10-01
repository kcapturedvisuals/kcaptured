import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MasonryGallery } from "@/components/masonry-gallery";
import { pool } from "@/lib/db";
import type { PortfolioImage } from "@/lib/portfolio-data";

export const metadata = {
  title: "Portfolio | KCAPTURED DMV Photography",
  description:
    "Explore the KCAPTURED portfolio with lifestyle, studio, portrait, and athletic photography from Jessup, Maryland and the DMV.",
  keywords: [
    "Kcaptured Visuals",
    "DMV photography portfolio",
    "Jessup Maryland portraits",
    "studio photography examples",
    "lifestyle portrait photography",
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Always fetch fresh data - don't cache uploads
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PortfolioPage() {
  let images: PortfolioImage[] = [];

  try {
    const result = await pool.query(
      "SELECT id, public_id, cloudinary_url, category, title, caption, featured, width, height FROM portfolio_items WHERE active = true ORDER BY sort_order ASC",
    );
    images = result.rows.map((row: any) => ({
      id: row.id,
      publicId: row.public_id,
      cloudinaryUrl: row.cloudinary_url,
      category: row.category,
      title: row.title,
      caption: row.caption ?? undefined,
      featured: row.featured,
      width: row.width ?? 1200,
      height: row.height ?? 800,
    }));
  } catch (error) {
    console.error("[portfolio] failed to load portfolio items", error);
  }

  // load settings to determine portfolio view mode
  let portfolioView = 'current';
  try {
    const settingsRes = await pool.query('SELECT portfolio_view FROM site_settings WHERE id = $1', ['site-settings']);
    if (settingsRes.rows[0] && settingsRes.rows[0].portfolio_view) {
      portfolioView = settingsRes.rows[0].portfolio_view;
    }
  } catch (err) {
    console.error('[portfolio] failed to load settings', err);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main>
        <section
          className="pt-8 pb-16 md:pt-12 md:pb-24 relative bg-[#e63143]"
          style={{
            backgroundImage: 'url(https://res.cloudinary.com/dla5ebx4j/image/upload/f_auto,q_auto,w_1200/v1781717926/2W1A9136__2_y6lin6.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
          </div>

          <MasonryGallery images={images} mode={portfolioView === 'masonry' ? 'masonry' : 'current'} />
        </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
