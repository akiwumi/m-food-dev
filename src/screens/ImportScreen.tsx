import { useState } from "react";
import { Upload, Check } from "lucide-react";
import { TopBar } from "../components/AppChrome";

export function ImportScreen() {
  const [url, setUrl] = useState(""); const [done, setDone] = useState(false);
  return <div className="screen"><TopBar title="Import recipe" /><section className="import-card"><Upload /><span>WEB RECIPE IMPORT</span><h1>Bring a trusted recipe into your library.</h1><p>We’ll preserve the source, extract ingredients and steps, then ask you to review it before use.</p><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/recipe" /><button className="primary" onClick={() => setDone(Boolean(url))}>Import & review</button>{done && <div className="import-success"><Check /><b>Draft created</b><span>Structure checked · source retained · waiting for review</span></div>}</section></div>;
}
