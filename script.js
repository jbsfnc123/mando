(() => {
  'use strict';

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const closeMenu = () => {
    nav?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Buka menu');
  };

  menuButton?.addEventListener('click', () => {
    const isOpen = nav?.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(Boolean(isOpen)));
    menuButton.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.matches('.workflow-console')) entry.target.classList.add('workflow-ready');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

  const sections = [...document.querySelectorAll('main > section[id]')];
  const navLinks = [...document.querySelectorAll('.primary-nav a')];
  const sectionObserver = new IntersectionObserver((entries) => {
    const current = entries.find((entry) => entry.isIntersecting);
    if (!current) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${current.target.id}`));
  }, { rootMargin: '-35% 0px -55%', threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const workflow = document.querySelector('.workflow-console');
  const stages = [...document.querySelectorAll('.process-stage')];
  const nodes = [...document.querySelectorAll('.process-node')];
  const tourToggle = document.querySelector('#tour-toggle');
  const processNumber = document.querySelector('#process-number');
  const processName = document.querySelector('#process-name');
  const processDescription = document.querySelector('#process-description');
  const processReadout = document.querySelector('.process-readout');
  const throughputValue = document.querySelector('#throughput-value');
  const pointer = { x: 0, y: 0 };
  const processData = [
    { name: 'Intake', description: 'Menerima request, data, tiket, dan event dari seluruh kanal bisnis.', throughput: '1,284/hr' },
    { name: 'Analyze', description: 'Menilai kebutuhan, risiko, dampak, dan prioritas secara terukur.', throughput: '962/hr' },
    { name: 'Build', description: 'Menjalankan development, konfigurasi, testing, dan approval.', throughput: '746/hr' },
    { name: 'Integrate', description: 'Menghubungkan API, aplikasi, database, dan vendor.', throughput: '1,052/hr' },
    { name: 'Monitor', description: 'Memantau performa sistem, status layanan, dan hasil bisnis.', throughput: '2,418/hr' },
  ];
  let activeProcess = 0;
  let tourTimer = null;
  let isTourPlaying = !reduceMotion;

  const setActiveProcess = (index, announce = false) => {
    activeProcess = (index + stages.length) % stages.length;
    processReadout?.setAttribute('aria-live', announce ? 'polite' : 'off');
    stages.forEach((stage, stageIndex) => {
      const isActive = stageIndex === activeProcess;
      stage.classList.toggle('active', isActive);
      nodes[stageIndex]?.setAttribute('aria-pressed', String(isActive));
    });
    const current = processData[activeProcess];
    if (processNumber) processNumber.textContent = `STAGE ${String(activeProcess + 1).padStart(2, '0')}`;
    if (processName) processName.textContent = current.name;
    if (processDescription) processDescription.textContent = current.description;
    if (throughputValue) throughputValue.textContent = current.throughput;
  };

  const updateTourControl = () => {
    if (!tourToggle) return;
    tourToggle.setAttribute('aria-pressed', String(isTourPlaying));
    tourToggle.setAttribute('aria-label', `${isTourPlaying ? 'Pause' : 'Play'} workflow auto-tour`);
    const label = tourToggle.querySelector('span');
    if (label) label.textContent = isTourPlaying ? 'Pause tour' : 'Play tour';
  };

  const stopTourTimer = () => {
    if (tourTimer) window.clearInterval(tourTimer);
    tourTimer = null;
  };

  const startTourTimer = () => {
    stopTourTimer();
    if (!isTourPlaying || document.hidden) return;
    tourTimer = window.setInterval(() => setActiveProcess(activeProcess + 1), 2100);
  };

  nodes.forEach((node, index) => {
    node.addEventListener('click', () => {
      setActiveProcess(index, true);
      if (isTourPlaying) startTourTimer();
    });
    node.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      const nextIndex = (index + direction + nodes.length) % nodes.length;
      nodes[nextIndex].focus();
      setActiveProcess(nextIndex, true);
      if (isTourPlaying) startTourTimer();
    });
  });

  tourToggle?.addEventListener('click', () => {
    isTourPlaying = !isTourPlaying;
    updateTourControl();
    if (isTourPlaying) startTourTimer(); else stopTourTimer();
  });

  updateTourControl();
  setActiveProcess(0);
  startTourTimer();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTourTimer(); else startTourTimer();
  });

  window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const canvas = document.querySelector('#hero-canvas');
  if (!canvas || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 100);
  camera.position.z = 9;

  const group = new THREE.Group();
  group.position.set(2.8, 0.2, 0);
  scene.add(group);

  const count = window.innerWidth < 700 ? 520 : 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color('#22d3ee');
  const violet = new THREE.Color('#a78bfa');
  const pink = new THREE.Color('#f472b6');

  for (let i = 0; i < count; i += 1) {
    const radius = 1.7 + Math.random() * 2.7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const idx = i * 3;
    positions[idx] = radius * Math.sin(phi) * Math.cos(theta) * 1.15;
    positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = radius * Math.cos(phi) * 0.65;
    const chance = Math.random();
    const color = chance > 0.72 ? pink : chance > 0.4 ? cyan : violet;
    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.78, sizeAttenuation: true });
  const particles = new THREE.Points(geometry, material);
  group.add(particles);

  const curvePoints = [];
  for (let i = 0; i < 70; i += 1) {
    const angle = (i / 69) * Math.PI * 4.2;
    const radius = 1.2 + (i / 69) * 2.6;
    curvePoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * .72) * 1.3, Math.sin(angle) * 1.2));
  }
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tube = new THREE.TubeGeometry(curve, 180, 0.012, 5, false);
  const tubeMaterial = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.72 });
  group.add(new THREE.Mesh(tube, tubeMaterial));

  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    group.position.x = width < 700 ? 1.3 : 3.2;
    if (workflow && width <= 900) workflow.style.removeProperty('transform');
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let frameId;
  const clock = new THREE.Clock();
  const render = () => {
    const elapsed = clock.getElapsedTime();
    const targetX = reduceMotion ? 0 : pointer.y * 0.14;
    const targetY = reduceMotion ? 0 : pointer.x * 0.22;
    group.rotation.x += (targetX - group.rotation.x) * 0.035;
    const ambientTurn = reduceMotion ? 0 : elapsed * 0.035;
    group.rotation.y += (targetY + ambientTurn - group.rotation.y) * 0.025;
    particles.rotation.z = reduceMotion ? 0 : elapsed * 0.025;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(elapsed * 1.4) * 0.025;
    particles.scale.setScalar(pulse);
    if (workflow && !reduceMotion && window.innerWidth > 900) {
      workflow.style.transform = `perspective(1100px) rotateX(${pointer.y * -1.3}deg) rotateY(${pointer.x * 1.8}deg)`;
    }
    renderer.render(scene, camera);
    if (!reduceMotion) frameId = window.requestAnimationFrame(render);
  };
  render();

  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
    } else {
      clock.getDelta();
      render();
    }
  });
})();
