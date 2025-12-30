/** @type { import('@storybook/react').Preview } */
import '../src/index.css';

const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0A0F1E' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F1E 0%, #1E293B 100%)' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
