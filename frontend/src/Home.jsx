import pikolBg from './assets/pikol.jpg';

export const Home = () => {
  return (
    <div className='h-screen w-full bg-[#5A9F68]'>
      <div className='h-full relative overflow-hidden  '>
        
        {/* Blurred image */}
        <div
          className='absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110'
          style={{ backgroundImage: `url(${pikolBg})` }}
        />

        {/* Dark tint on top of the image */}
        <div className='absolute inset-0 bg-black/30' />

        {/* Header row: logo + sign in */}
        <div className='relative flex flex-row items-center justify-between h-16 px-10 pt-8'>
          <h1 className='font-bold text-gray-300 text-lg'>
            Pikol League
          </h1>

          <button className='px-5 py-2 hover:bg-black/20 rounded-md bg-black/10 text-gray-200 font-bold text-md'>
            Sign in
          </button>
        </div>

        {/* Second section: header text */}
        <div className='w-full max-w-3xl relative flex flex-col px-10 pt-20'>
          <h1 className='text-gray-100 text-5xl font-bold leading-tight pb-6'>
            One platform that can manage{' '}
            <span className='text-[#08A045]'>
              your open play & tournaments
            </span>{' '}
            efficiently
          </h1>

          <p className='text-gray-300 text-lg pb-8 max-w-lg'>
            Streamline scheduling, brackets, and player management — all in one place.
          </p>

          <button className='w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold hover:bg-black/10 transition-colors'>
            Create Account
          </button>
        
           
          <div className='text-gray-200'>
            
          </div>
        </div>

      </div>
    </div>
  )
}