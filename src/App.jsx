import ModelViewer from './ModelViewer'

const STATS = [
  { value: '15+', label: 'лет на рынке' },
  { value: '320', label: 'выполненных проектов' },
  { value: '18', label: 'стран присутствия' },
  { value: '99.7%', label: 'точность данных' },
]

const SERVICES = [
  {
    title: 'MWD / LWD телеметрия',
    desc: 'Системы измерений во время бурения. Передача данных о траектории скважины и параметрах пласта в режиме реального времени.',
    color: 'var(--blue)',
  },
  {
    title: 'Навигация скважин',
    desc: 'Точное направленное бурение с использованием современных гироскопических и магнитных инструментов. Контроль траектории на всех этапах.',
    color: 'var(--red)',
  },
  {
    title: 'Обработка и интерпретация',
    desc: 'Оперативная обработка каротажных данных. Геонавигация и построение геомеханических моделей для принятия инженерных решений.',
    color: 'var(--blue)',
  },
]

export default function App() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px !important; }
          .nav-links { display: none !important; }
          .hero-model {
            height: 60vw !important;
            min-height: 260px !important;
            max-height: 400px !important;
          }
          .hero-text { padding: 32px 20px 60px !important; }
          .stats-section { padding: 32px 16px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-grid > div:nth-child(2) { border-right: none !important; }
          .stats-grid > div:nth-child(3) { border-top: 1px solid var(--border); }
          .stats-grid > div:nth-child(4) { border-top: 1px solid var(--border); border-right: none !important; }
          .about-section { padding: 48px 20px !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .services-section { padding: 0 20px 48px !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .footer-inner { padding: 20px 16px !important; flex-direction: column !important; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-inner" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: '64px',
        background: 'rgba(8,9,15,0.88)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(14px)',
      }}>
        {/* LOGO */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>

          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text)', textTransform: 'uppercase' }}>
            Буровая телеметрия
          </span>
        </a>
        <ul className="nav-links" style={{ display: 'flex', gap: '32px', listStyle: 'none' }}>
          {['О нас', 'Услуги', 'Контакты'].map((item) => (
            <li key={item}>
              <a href="#" style={{
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                letterSpacing: '0.04em',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.target.style.color = 'var(--blue)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}>
        {/* Фоновые акценты */}
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,163,220,0.08) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', top: '8%', right: '15%',
          width: '250px', height: '250px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(226,46,16,0.07) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* 3D модель — на всю ширину */}
        <div className="hero-model" style={{
          position: 'relative',
          width: '100%',
          height: '85vh',
          WebkitMaskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 35%, rgba(0,0,0,0.45) 62%, transparent 82%)',
          maskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 35%, rgba(0,0,0,0.45) 62%, transparent 82%)',
        }}>
          <ModelViewer models={[
            {
              url: `${import.meta.env.BASE_URL}WPR.glb`,
              name: 'WPR',
              explodeConfig: {
                fastenerNames: ['nut', 'bolt', 'screw', 'hex', 'washer', 'fastener'],
                fastenerSizeRatio: 0.12,
                radialPushRatio: 0.18,
              },
              // Описания деталей: ключ = точное имя mesh из GLB-файла (видно в поле "id" инфо-панели)
              parts: {
                // Пример структуры — заполните после просмотра id деталей в инфо-панели:
                // 'MeshName': {
                //   title: 'Название детали',
                //   description: 'Описание назначения детали в инструменте.',
                //   specs: [
                //     { label: 'Материал', value: 'Нержавеющая сталь' },
                //     { label: 'Рабочее давление', value: 'до 1000 бар' },
                //   ],
                // },
              },
            },
            {
              url: `${import.meta.env.BASE_URL}alternator.glb`,
              name: 'Пульсатор',
              initialCamera:  { direction: [0.913, 0.408, 0.005], distance: 4.5 },
              explodedCamera: { direction: [1.000, 0.002, -0.003], distance: 3.1 },
              explodeConfig: {
                explodeStyle: 'plate',
                spreadRatio: 0.01,
                bodyRadialRatio: 0,
                lockedParts: [
                  ['Цилиндр129', 'Цилиндр129_1', 'Цилиндр129_2', 'Цилиндр129_3', 'Цилиндр129_4', 'Цилиндр129_11', 'Цилиндр129_12'],
                  ['Цилиндр158', 'Цилиндр158_1'],
                  ['Цилиндр128', 'Цилиндр129_5', 'Цилиндр129_6', 'Цилиндр129_7', 'Цилиндр129_8', 'Цилиндр129_9', 'Цилиндр129_10', 'Цилиндр128_1', 'Цилиндр128_2', 'Цилиндр128_3', 'Цилиндр128_4', 'Цилиндр134_1', 'Цилиндр134_2', 'Цилиндр134_3', 'Цилиндр134'],
                  ['Цилиндр162', 'Цилиндр162_4', 'Цилиндр162_1', 'Цилиндр162_2', 'Цилиндр162_3'],
                  ['Цилиндр156', 'Цилиндр156_2', 'Цилиндр156_1'],
                  ['Цилиндр132', 'Цилиндр132_2', 'Цилиндр132_1'],
                ],
                // partOrder задаёт точный порядок разлёта деталей при разборке.
                // Используйте имена из поля "id" в инфо-панели (клик на деталь).
                // Для групп из lockedParts достаточно указать ПЕРВОЕ имя группы.
                // Пример (раскомментируйте и заполните нужный порядок):
                // partOrder: [
                //   'Цилиндр129',  // первая снимаемая деталь — группа 0
                //   'Цилиндр158',  // вторая                  — группа 1
                //   'Цилиндр128',  // третья                  — группа 2
                //   // 'ИмяДетали', // отдельные детали по имени
                // ],
              },
              parts: {
                // Заполните после просмотра id деталей в инфо-панели.
                // Ключ — точное имя mesh (поле "id" в инфо-панели при клике на деталь).
                // Пример:
                // 'Цилиндр129': {
                //   title: 'Корпус верхний',
                //   description: 'Верхняя секция пульсатора. Удаляется первой при разборке.',
                //   specs: [
                //     { label: 'Материал', value: 'Нержавеющая сталь' },
                //   ],
                // },
              },
            },
          ]} />
        </div>

        {/* Текст — под моделью, по центру */}
        <div className="hero-text" style={{
          position: 'relative', zIndex: 2,
          textAlign: 'center',
          padding: '48px 24px 80px',
        }}>
          <p style={{
            fontSize: '0.68rem', letterSpacing: '0.32em',
            color: 'var(--blue)', marginBottom: '16px',
            textTransform: 'uppercase',
          }}>
            Точность · Надёжность · Данные
          </p>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.8rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.06,
            marginBottom: '24px',
          }}>
            Буровая
            <span style={{ display: 'block', color: 'var(--blue)' }}>телеметрия</span>
            <span style={{
              display: 'block',
              fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
              fontWeight: 400,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
              marginTop: '8px',
            }}>нового поколения</span>
          </h1>
          <p style={{
            maxWidth: '560px',
            margin: '0 auto 40px',
            color: 'var(--text-muted)',
            fontSize: '1rem',
            lineHeight: 1.72,
          }}>
            Комплексные решения в области телеметрии и навигации скважин.
            Данные в реальном времени — от забоя до поверхности.
          </p>
          <div className="hero-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={{
              background: 'var(--blue)', color: '#fff',
              border: 'none', padding: '13px 32px',
              borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700,
              fontSize: '0.875rem', letterSpacing: '0.05em',
              transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Наши решения
            </button>
            <button style={{
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid var(--border)', padding: '13px 28px',
              borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.875rem',
              letterSpacing: '0.04em', transition: 'color 0.15s, border-color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Контакты
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section" style={{ padding: '48px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="stats-grid" style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0',
        }}>
          {STATS.map(({ value, label }, i) => (
            <div key={label} style={{
              textAlign: 'center',
              padding: '24px',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontSize: '2rem', fontWeight: 800,
                color: i % 2 === 0 ? 'var(--blue)' : 'var(--red)',
                lineHeight: 1,
              }}>{value}</div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" style={{ padding: '80px 48px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--blue)', marginBottom: '12px', textTransform: 'uppercase' }}>
          О компании
        </p>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 700, marginBottom: '24px', lineHeight: 1.2 }}>
          Инженерная точность<br />на каждом метре скважины
        </h2>
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.75 }}>
          <p>
            Более 15 лет мы разрабатываем и внедряем телеметрические системы для нефтегазовой отрасли.
            Наши инструменты работают в сложнейших скважинных условиях — высокое давление, температура,
            вибрация — и обеспечивают непрерывный поток данных с забоя.
          </p>
          <p>
            Собственные MWD и LWD системы, программное обеспечение реального времени и команда
            инженеров-телеметристов — всё это позволяет нам обеспечивать точное направленное бурение
            и минимальные риски в 18 странах мира.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-section" style={{ padding: '0 48px 80px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--red)', marginBottom: '12px', textTransform: 'uppercase' }}>
          Направления
        </p>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 700, marginBottom: '36px', lineHeight: 1.2 }}>
          Наши компетенции
        </h2>
        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {SERVICES.map(({ title, desc, color }) => (
            <div key={title} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px 24px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = color
                e.currentTarget.style.boxShadow = `0 0 28px ${color === 'var(--blue)' ? 'rgba(29,163,220,0.1)' : 'rgba(226,46,16,0.1)'}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ width: '32px', height: '2px', background: color, marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px' }}>{title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-inner" style={{
        marginTop: 'auto',
        padding: '24px 48px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Буровая телеметрия
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} · Все права защищены
        </span>
      </footer>
    </>
  )
}
