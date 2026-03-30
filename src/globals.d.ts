declare module 'html2pdf.js' {
  const html2pdf: () => {
    from: (source: HTMLElement) => {
      set: (options: unknown) => {
        save: () => Promise<void>;
      };
    };
  };
  export default html2pdf;
}

declare module 'stylis' {
  export const prefixer: (element: unknown) => void;
}
