param([string]$Path)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
public class AtlasGridInspector {
  public static object Inspect(byte[] data, int width, int height, int stride) {
        long[] rows = new long[height], cols = new long[width];
        for(int y=0;y<height;y++) for(int x=0;x<width;x++) {
          int p=y*stride+x*3;
          int v=Math.Max(data[p],Math.Max(data[p+1],data[p+2]));
          if(v>30) { rows[y]+=v; cols[x]+=v; }
        }
        return new {width,height,rows,cols};
  }
}
'@
$gridBitmap = [Drawing.Bitmap]::FromFile($Path)
$gridBits = $gridBitmap.LockBits([Drawing.Rectangle]::new(0,0,$gridBitmap.Width,$gridBitmap.Height), [Drawing.Imaging.ImageLockMode]::ReadOnly, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
try {
  $gridBytes = [byte[]]::new($gridBits.Stride * $gridBitmap.Height)
  [Runtime.InteropServices.Marshal]::Copy($gridBits.Scan0,$gridBytes,0,$gridBytes.Length)
  [AtlasGridInspector]::Inspect($gridBytes,$gridBitmap.Width,$gridBitmap.Height,$gridBits.Stride) | ConvertTo-Json -Compress
} finally {
  $gridBitmap.UnlockBits($gridBits)
  $gridBitmap.Dispose()
}
