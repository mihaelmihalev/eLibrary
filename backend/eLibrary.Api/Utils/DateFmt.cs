namespace eLibrary.Api.Utils;

public static class DateFmt
{
    public static string Bg(DateTime dt) => dt.ToString("dd.MM.yyyy HH:mm:ss");
    public static string Bg(DateTime? dt) => dt.HasValue ? Bg(dt.Value) : "—";
}
