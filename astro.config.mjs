// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://wonderlandos.github.io',
  base: '/docs',
  integrations: [
    starlight({
      title: 'WolOS Docs',
      description: 'Documentation for WolOS, a calm, simple desktop on the PC you already own.',
      logo: { src: './src/assets/wolos-mark.svg', alt: 'WolOS' },
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'WolOS on GitHub', href: 'https://github.com/wonderlandos/wolos' },
      ],
      editLink: { baseUrl: 'https://github.com/wonderlandos/docs/edit/main/' },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Welcome', slug: 'getting-started/welcome' },
            { label: 'Try WolOS', slug: 'getting-started/try' },
            { label: 'Install WolOS', slug: 'getting-started/install' },
            { label: 'The installer, step by step', slug: 'getting-started/installer' },
            { label: 'Secure Boot and MOK', slug: 'getting-started/secure-boot' },
          ],
        },
        {
          label: 'Using WolOS',
          items: [
            { label: 'The Store', slug: 'using/store' },
            { label: 'The AUR tab', slug: 'using/aur' },
            { label: 'ClamAV scanning', slug: 'using/clamav' },
            { label: 'Memory Saver', slug: 'using/memory-saver' },
            { label: 'Updates, slots and rollback', slug: 'using/updates' },
          ],
        },
        {
          label: 'Developers',
          items: [
            { label: 'libwol, the app API', slug: 'developers/libwol' },
            { label: 'wopkg and .wol packages', slug: 'developers/wopkg' },
            { label: 'Building the image', slug: 'developers/building' },
          ],
        },
        {
          label: 'Advanced',
          items: [
            { label: 'WolKernel vs upstream Linux', slug: 'advanced/wolkernel' },
            { label: 'Scheduling and QoS', slug: 'advanced/kernel-scheduling' },
            { label: 'Locks and waits', slug: 'advanced/kernel-locks' },
            { label: 'Memory and I/O', slug: 'advanced/kernel-memory-io' },
            { label: 'Entry, graphics and filesystems', slug: 'advanced/kernel-entry-gpu-fs' },
            { label: 'Sealed boot and lockdown', slug: 'advanced/sealed-boot' },
          ],
        },
        {
          label: 'Legal',
          items: [{ label: 'License and source', slug: 'legal/license' }],
        },
      ],
    }),
  ],
});
