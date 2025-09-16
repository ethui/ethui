describe("Hello ethui", () => {
  it("should display the onboarding page by default", async () => {
    const header = $("main header");
    const text = await header.getText();
    expect(text).toMatch(/Onboarding/);
  });

  it("should display the sidebar", async () => {
    const sidebar = $("div[data-sidebar='sidebar']");
    const text = await sidebar.getText();
    expect(text).toMatch(/Account/);
    expect(text).toMatch(/Connections/);
    expect(text).toMatch(/Explorer/);
    expect(text).toMatch(/Settings/);
  });
});
