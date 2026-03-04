import Navbar from '@/components/Navbar';
import FileUpload from '@/components/FileUpload';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar />

      {/* ═══ Hero Section ═══ */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="badge badge-info">IS 2190:2024</span>
            <span className="badge badge-pass">AI-Powered</span>
            <span className="badge badge-warning">Commercial Buildings</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Check Your Fire Safety{' '}
            <span className="gradient-text">Compliance in Seconds</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your floor plan. Get IS 2190:2024 fire extinguisher compliance
            results instantly. Know your NOC readiness before you apply.
          </p>

          {/* Upload component */}
          <div id="upload" className="max-w-lg mx-auto">
            <FileUpload />
          </div>
        </div>
      </section>

      {/* ═══ Stats Bar ═══ */}
      <section className="py-8 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-orange-400">80%</div>
            <div className="text-sm text-slate-400 mt-1">of fire NOC rejections are preventable</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-400">~30s</div>
            <div className="text-sm text-slate-400 mt-1">average analysis time</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-400">IS 2190</div>
            <div className="text-sm text-slate-400 mt-1">latest 2024 standard</div>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            How It Works
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">
            Three simple steps to check your fire extinguisher compliance
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card text-center group hover:-translate-y-1 transition-transform">
              <div className="text-4xl mb-4">📤</div>
              <div className="badge badge-info mb-3">Step 1</div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Upload</h3>
              <p className="text-sm text-slate-500">
                Drop your DWG, PDF, or image floor plan. We handle the conversion.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card text-center group hover:-translate-y-1 transition-transform">
              <div className="text-4xl mb-4">🧠</div>
              <div className="badge badge-warning mb-3">Step 2</div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Analyze</h3>
              <p className="text-sm text-slate-500">
                AI extracts building data and checks against IS 2190:2024 fire extinguisher rules.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card text-center group hover:-translate-y-1 transition-transform">
              <div className="text-4xl mb-4">✅</div>
              <div className="badge badge-pass mb-3">Step 3</div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Results</h3>
              <p className="text-sm text-slate-500">
                Get your compliance score, fix violations, and know your NOC readiness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ What We Check ═══ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            What We Check
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '🔥', label: 'Class A (Solids)', desc: 'Wood, paper, textiles — Table 1' },
              { icon: '💧', label: 'Class B/C (Liquids/Gases)', desc: 'Flammable liquids & gases — Table 2' },
              { icon: '🍳', label: 'Class F (Cooking)', desc: 'Kitchen cooking media — Table 3' },
              { icon: '⚡', label: 'Electrical Hazards', desc: 'CO2/clean agent — cl 7.5' },
              { icon: '⚠️', label: 'Hazard Classification', desc: 'Low/Moderate/High — Annex B, Table 6' },
              { icon: '🏢', label: 'Commercial Buildings', desc: 'Offices, retail, warehouses, restaurants' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 hover:border-orange-200 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-slate-700">{item.label}</p>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
