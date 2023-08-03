describe("Hello Tauri", () => {
  it("should be cordial", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const header = await $("body");
    const text = await header.getHTML();
    console.log(text);
    expect(text).toMatch(/^[hH]ello/);
  });
});
