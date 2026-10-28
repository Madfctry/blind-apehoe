import { Hero } from '@/components/sections/Hero';
import { File } from '@/components/sections/File';
import { PrivacySeason } from '@/components/sections/PrivacySeason';
import { Rewards } from '@/components/sections/Rewards';
import { Redactor } from '@/components/sections/Redactor';
import { HowToBuy } from '@/components/sections/HowToBuy';
import { Chart } from '@/components/sections/Chart';
import { Footer } from '@/components/sections/Footer';

export default function Page() {
  return (
    <>
      <main id="main">
        <Hero />
        <File />
        <PrivacySeason />
        <Rewards />
        <Redactor />
        <HowToBuy />
        <Chart />
      </main>
      <Footer />
    </>
  );
}
